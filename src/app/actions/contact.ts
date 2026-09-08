"use server";

import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { validateContact } from "@/lib/contactValidation";
import type { ContactState } from "@/lib/contactState";

// This module may export nothing but async functions — `"use server"` enforces
// it. ContactState and initialContactState therefore live in src/lib.

/** Anything submitted faster than this was not typed by a person. */
const MIN_FILL_MS = 2000;

/**
 * Best-effort notification. Never throws: a delivery problem must not fail a
 * submission that is already safely in Postgres.
 */
async function notify(row: {
  id: number;
  name: string;
  email: string;
  message: string;
}): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  // Not an error condition. Local development and CI run without secrets, and
  // the submission is already durable by the time we get here.
  if (!apiKey) return "RESEND_API_KEY not set";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || "contact@samklep.dev",
      to: process.env.CONTACT_TO_EMAIL || "hello@samklep.dev",
      replyTo: row.email,
      subject: `Portfolio contact from ${row.name}`,
      text: `${row.name} <${row.email}>\n\n${row.message}\n\n— submission #${row.id}`,
    });
    return error ? error.message : null;
  } catch (cause) {
    return cause instanceof Error ? cause.message : String(cause);
  }
}

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  // --- spam gates -----------------------------------------------------------
  // Both report success and write nothing. Telling a bot it failed only makes
  // it retry with a variation.
  const honeypot = String(formData.get("company") ?? "").trim();
  if (honeypot) return { status: "success" };

  const renderedAt = Number(formData.get("renderedAt"));
  // Only reject when the timestamp is present AND implausible. A missing or
  // unparseable value is not evidence of a bot, and discarding a real person's
  // message over it would be exactly the silent loss this form exists to avoid.
  if (Number.isFinite(renderedAt) && renderedAt > 0) {
    if (Date.now() - renderedAt < MIN_FILL_MS) return { status: "success" };
  }

  // --- validation -----------------------------------------------------------
  const result = validateContact(values);
  if (!result.ok) {
    return { status: "error", errors: result.errors, values };
  }

  // --- persist, then notify -------------------------------------------------
  // Order matters. The row is the durable record; email is best effort. Sending
  // first would lose the message on any provider hiccup.
  let inserted;
  try {
    [inserted] = await db
      .insert(contactSubmissions)
      .values(result.data)
      .returning({ id: contactSubmissions.id });
  } catch (cause) {
    console.error("contact: insert failed", cause);
    return {
      status: "error",
      formError:
        "Something went wrong saving your message. Please email hello@samklep.dev instead.",
      values,
    };
  }

  const emailError = await notify({ id: inserted.id, ...result.data });

  // Bookkeeping only — a failure to record the outcome must not change what the
  // visitor sees, because their message did arrive.
  try {
    await db
      .update(contactSubmissions)
      .set(
        emailError
          ? { emailError }
          : { emailedAt: new Date(), emailError: null }
      )
      .where(eq(contactSubmissions.id, inserted.id));
  } catch (cause) {
    console.error("contact: could not record delivery outcome", cause);
  }

  if (emailError) {
    // Deliberately still a success. From the visitor's side the message was
    // received; what failed was my notification, which is mine to chase.
    console.error("contact: notification failed —", emailError);
  }

  return { status: "success" };
}
