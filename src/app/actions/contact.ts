"use server";

import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { validateContact } from "@/lib/contactValidation";
import type { ContactState } from "@/lib/contactState";
import { CONTACT_EMAIL } from "@/lib/siteLinks";

async function notify(row: {
  id: number;
  name: string;
  email: string;
  budget: string;
  website: string;
  message: string;
}): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return "RESEND_API_KEY not set";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || "contact@samklep.dev",
      to: process.env.CONTACT_TO_EMAIL || CONTACT_EMAIL,
      replyTo: row.email,
      subject: `Portfolio contact from ${row.name}`,
      text: [
        `${row.name} <${row.email}>`,
        row.budget ? `Budget: ${row.budget}` : null,
        row.website ? `Website: ${row.website}` : null,
        "",
        row.message,
        "",
        `— submission #${row.id}`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
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
    budget: String(formData.get("budget") ?? ""),
    website: String(formData.get("website") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const honeypot = String(formData.get("referralCode") ?? "").trim();
  if (honeypot) {
    console.warn("contact: honeypot tripped, dropping submission", {
      email: values.email,
    });
    return { status: "success" };
  }

  const result = validateContact(values);
  if (!result.ok) {
    return { status: "error", errors: result.errors, values };
  }

  let inserted;
  try {
    [inserted] = await db
      .insert(contactSubmissions)
      .values({
        ...result.data,
        budget: result.data.budget || null,
        website: result.data.website || null,
      })
      .returning({ id: contactSubmissions.id });
  } catch (cause) {
    console.error("contact: insert failed", cause);
    return {
      status: "error",
      formError: `Something went wrong saving your message. Please email ${CONTACT_EMAIL} instead.`,
      values,
    };
  }

  const emailError = await notify({ id: inserted.id, ...result.data });

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
    console.error("contact: notification failed —", emailError);
  }

  return { status: "success" };
}
