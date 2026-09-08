/**
 * Validation for the contact form.
 *
 * Deliberately free of React and database imports so the rules can be read,
 * reasoned about, and later tested without standing up either.
 */

export type ContactFields = {
  name: string;
  email: string;
  /** Optional. Empty string is normalised to null before it reaches the DB. */
  budget: string;
  /** Optional. Stored as typed — no protocol is prepended and no format is
   *  enforced, because rejecting an oddly-written URL costs an enquiry and
   *  buys nothing. */
  website: string;
  message: string;
};

export type ContactErrors = Partial<Record<keyof ContactFields, string>>;

export const LIMITS = {
  name: 100,
  email: 200,
  budget: 100,
  website: 200,
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

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function validateContact(input: {
  name: unknown;
  email: unknown;
  budget?: unknown;
  website?: unknown;
  message: unknown;
}): ValidationResult {
  const name = str(input.name);
  const email = str(input.email);
  const budget = str(input.budget);
  const website = str(input.website);
  const message = str(input.message);

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

  // Optional fields: only ever too long, never missing. No format check on the
  // website — "acme.com", "www.acme.com" and a full URL are all fine, and
  // guessing which is wrong would reject valid input.
  if (budget.length > LIMITS.budget) {
    errors.budget = `Please keep this under ${LIMITS.budget} characters.`;
  }

  if (website.length > LIMITS.website) {
    errors.website = `Please keep this under ${LIMITS.website} characters.`;
  }

  if (!message) {
    errors.message = "Please add a message.";
  } else if (message.length > LIMITS.message) {
    errors.message = `Please keep this under ${LIMITS.message} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, email, budget, website, message } };
}
