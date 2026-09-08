export type ContactFields = {
  name: string;
  email: string;
  budget: string;
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
