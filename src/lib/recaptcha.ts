// Server-side verification for reCAPTCHA v3 tokens produced on the contact form.
// v3 returns a 0.0–1.0 score rather than a pass/fail; submissions at or above
// this threshold are treated as human. 0.5 is Google's documented default.
export const RECAPTCHA_MIN_SCORE = 0.5;

const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

type SiteverifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
};

/**
 * Returns true when the token is a valid, human-scoring reCAPTCHA response.
 *
 * When `RECAPTCHA_SECRET_KEY` is unset the check is skipped (returns true), so
 * local development and not-yet-configured deployments keep working — the
 * honeypot still guards the form. With a secret configured it fails closed:
 * an empty token, a failed verification, a sub-threshold score, or a network
 * error all return false.
 */
export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // not configured — skip
  if (!token) return false;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as SiteverifyResponse;
    return Boolean(data.success) && (data.score ?? 0) >= RECAPTCHA_MIN_SCORE;
  } catch (cause) {
    console.error("contact: reCAPTCHA verification failed", cause);
    return false; // fail closed
  }
}
