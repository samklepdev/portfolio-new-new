"use client";

import { useActionState } from "react";
import { submitContact } from "@/app/actions/contact";
import { initialContactState } from "@/lib/contactState";
import { LIMITS } from "@/lib/contactValidation";
import styles from "./ContactForm.module.css";

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
          undisplayed fields — and kept out of the tab order and the a11y tree
          so nobody using a keyboard or screen reader can land on it. */}
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

      {/* Input before label so the floating-label CSS can use a sibling
          selector; the visual order is restored in the stylesheet. */}
      <div className={styles.field}>
        <input
          id="contact-name"
          name="name"
          type="text"
          className={styles.input}
          placeholder=" "
          autoComplete="name"
          maxLength={LIMITS.name}
          required
          defaultValue={state.values?.name}
          aria-invalid={state.errors?.name ? true : undefined}
          aria-describedby={state.errors?.name ? "contact-name-error" : undefined}
        />
        <label htmlFor="contact-name" className={styles.label}>
          Name
        </label>
        {state.errors?.name && (
          <p id="contact-name-error" className={styles.error}>
            {state.errors.name}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <input
          id="contact-email"
          name="email"
          type="email"
          className={styles.input}
          placeholder=" "
          autoComplete="email"
          maxLength={LIMITS.email}
          required
          defaultValue={state.values?.email}
          aria-invalid={state.errors?.email ? true : undefined}
          aria-describedby={
            state.errors?.email ? "contact-email-error" : undefined
          }
        />
        <label htmlFor="contact-email" className={styles.label}>
          Email
        </label>
        {state.errors?.email && (
          <p id="contact-email-error" className={styles.error}>
            {state.errors.email}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <textarea
          id="contact-message"
          name="message"
          className={`${styles.input} ${styles.textarea}`}
          placeholder=" "
          rows={5}
          maxLength={LIMITS.message}
          required
          defaultValue={state.values?.message}
          aria-invalid={state.errors?.message ? true : undefined}
          aria-describedby={
            state.errors?.message ? "contact-message-error" : undefined
          }
        />
        <label htmlFor="contact-message" className={styles.label}>
          Message
        </label>
        {state.errors?.message && (
          <p id="contact-message-error" className={styles.error}>
            {state.errors.message}
          </p>
        )}
      </div>

      {state.formError && (
        <p className={styles.formError} role="alert">
          {state.formError}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Sending…" : "Send message"}
        <span className={styles.submitArrow} aria-hidden="true">
          &rarr;
        </span>
      </button>
    </form>
  );
}
