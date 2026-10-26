"use client";

import { useActionState, useEffect, useRef } from "react";
import Script from "next/script";
import { submitContact } from "@/app/actions/contact";
import { initialContactState } from "@/lib/contactState";
import { LIMITS } from "@/lib/contactValidation";
import styles from "./ContactForm.module.css";
import { toast } from "react-toastify";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

// Resolve a fresh reCAPTCHA v3 token for this submission. Returns "" when the
// widget isn't configured or hasn't loaded — the server treats a missing token
// as unconfigured (skips) or invalid (rejects) depending on its own secret.
function executeRecaptcha(): Promise<string> {
  const g = typeof window !== "undefined" ? window.grecaptcha : undefined;
  if (!RECAPTCHA_SITE_KEY || !g) return Promise.resolve("");
  return new Promise((resolve) => {
    g.ready(() => {
      g.execute(RECAPTCHA_SITE_KEY, { action: "contact" }).then(resolve, () =>
        resolve("")
      );
    });
  });
}

type FieldProps = {
  name: string;
  label: string;
  maxLength: number;
  error?: string;
  defaultValue?: string;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
  optional?: boolean;
};

function Field({
  name,
  label,
  maxLength,
  error,
  defaultValue,
  type = "text",
  autoComplete,
  multiline = false,
  optional = false,
}: FieldProps) {
  const id = `contact-${name}`;
  const errorId = `${id}-error`;

  const shared = {
    id,
    name,
    maxLength,
    defaultValue,
    autoComplete,
    required: !optional,
    className: styles.input,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <div className={multiline ? styles.fieldFull : styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>

      {multiline ? (
        <textarea {...shared} rows={6} className={`${styles.input} ${styles.textarea}`} />
      ) : (
        <input {...shared} type={type} />
      )}

      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    submitContact,
    initialContactState
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(
        "Message received — I’ll get back to you within two business days."
      );
      formRef.current?.reset();
    }
  }, [state]);

  // Attach a reCAPTCHA token just before dispatching the server action, so the
  // token is fresh (v3 tokens expire after ~2 minutes) and tied to this submit.
  async function submitWithRecaptcha(formData: FormData) {
    formData.set("recaptchaToken", await executeRecaptcha());
    formAction(formData);
  }

  return (
    <form ref={formRef} action={submitWithRecaptcha} className={styles.form} noValidate>
      {RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      )}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contact-referral">Referral code</label>
        <input
          id="contact-referral"
          name="referralCode"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className={styles.grid}>
        <Field
          name="name"
          label="Name"
          maxLength={LIMITS.name}
          autoComplete="name"
          error={state.errors?.name}
          defaultValue={state.values?.name}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          maxLength={LIMITS.email}
          autoComplete="email"
          error={state.errors?.email}
          defaultValue={state.values?.email}
        />
        <Field
          name="budget"
          label="Budget"
          optional
          maxLength={LIMITS.budget}
          error={state.errors?.budget}
          defaultValue={state.values?.budget}
        />
        <Field
          name="website"
          label="Website"
          optional
          maxLength={LIMITS.website}
          autoComplete="url"
          error={state.errors?.website}
          defaultValue={state.values?.website}
        />
        <Field
          name="message"
          label="Message"
          multiline
          maxLength={LIMITS.message}
          error={state.errors?.message}
          defaultValue={state.values?.message}
        />
      </div>

      {state.formError && (
        <p className={styles.formError} role="alert">
          {state.formError}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Sending…" : "Let’s talk"}
      </button>
    </form>
  );
}
