"use client";

import { useActionState } from "react";
import { submitContact } from "@/app/actions/contact";
import { initialContactState } from "@/lib/contactState";
import { LIMITS } from "@/lib/contactValidation";
import styles from "./ContactForm.module.css";

type FieldProps = {
  name: string;
  label: string;
  maxLength: number;
  error?: string;
  defaultValue?: string;
  type?: string;
  autoComplete?: string;
  /** Renders a textarea spanning both columns instead of a single-line input. */
  multiline?: boolean;
  optional?: boolean;
};

/**
 * One field, one shape. Five near-identical label/input/error blocks would be
 * five places to forget an aria-describedby.
 */
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

type ContactFormProps = {
  /**
   * When the form was rendered, used by the server's "submitted impossibly
   * fast" check. Passed in from the server component so the check still works
   * with JavaScript disabled.
   */
  renderedAt: number;
};

export function ContactForm({ renderedAt }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(
    submitContact,
    initialContactState
  );

  if (state.status === "success") {
    return (
      <div className={styles.success} role="status">
        <p className={styles.successTitle}>
          <span className={styles.successDot} aria-hidden="true" />
          Message received
        </p>
        <p className={styles.successText}>
          Thanks &mdash; I&rsquo;ll get back to you within two business days.
        </p>
      </div>
    );
  }

  return (
    // noValidate hands validation to the server, which is the authority here.
    // The native bubbles would otherwise compete with the inline errors.
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="renderedAt" value={renderedAt} />

      {/* Honeypot. Moved offscreen rather than display:none — some bots skip
          undisplayed fields — and kept out of the tab order and the a11y tree. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
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
