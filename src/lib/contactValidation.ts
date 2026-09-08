/**
 * Validation for the contact form.
 *
 * Deliberately free of React and database imports so the rules can be read,
 * reasoned about, and later tested without standing up either.
 */

export type ContactFields = {
  name: string;
  email: string;
  message: string;
};

export type ContactErrors = Partial<Record<keyof ContactFields, string>>;

export const LIMITS = {
  name: 100,
  email: 200,
  message: 5000,
} as const;

/**
 * Permissive on purpose. Real address syntax is far stranger than most patterns
 * allow, and the only actual proof an address works is mail arriving at it.
 * This catches the obvious typo — no `@`, nothing after the dot — without
 * turning away valid unusual addresses.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export type ValidationResult =
  | { ok: true; data: ContactFields }
  | { ok: false; errors: ContactErrors };

export function validateContact(input: {
  name: unknown;
  email: unknown;
  message: unknown;
}): ValidationResult {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";

  const errors: ContactErrors = {};

  if (!name) {
    errors.name = "Please tell me your name.";
  } else if (name.length > LIMITS.name) {
    errors.name = `Please keep this under ${LIMITS.name} characters.`;
  }

  if (!email) {
    errors.email = "Please add an email so I can reply.";
  } else if (email.length > LIMITS.email) {
    errors.email = `Please keep this under ${LIMITS.email} characters.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "That doesn't look like an email address.";
  }

  if (!message) {
    errors.message = "Please add a message.";
  } else if (message.length > LIMITS.message) {
    errors.message = `Please keep this under ${LIMITS.message} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, email, message } };
}
