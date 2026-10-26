// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyRecaptcha, RECAPTCHA_MIN_SCORE } from "./recaptcha";

const siteverify = (body: Record<string, unknown>) =>
  vi.fn().mockResolvedValue({ json: () => Promise.resolve(body) } as Response);

describe("verifyRecaptcha", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    delete process.env.RECAPTCHA_SECRET_KEY;
  });
  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("skips verification (allows) when no secret is configured", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;
    await expect(verifyRecaptcha("anything")).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled(); // never calls Google when unconfigured
  });

  it("rejects an empty token when a secret IS configured", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "secret";
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;
    await expect(verifyRecaptcha("")).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows a successful response at or above the score threshold", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "secret";
    global.fetch = siteverify({ success: true, score: RECAPTCHA_MIN_SCORE, action: "contact" });
    await expect(verifyRecaptcha("tok")).resolves.toBe(true);
  });

  it("rejects a successful response below the score threshold", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "secret";
    global.fetch = siteverify({ success: true, score: 0.1 });
    await expect(verifyRecaptcha("tok")).resolves.toBe(false);
  });

  it("rejects when Google reports success: false", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "secret";
    global.fetch = siteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
    await expect(verifyRecaptcha("tok")).resolves.toBe(false);
  });

  it("fails closed when the verify request throws", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "secret";
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));
    await expect(verifyRecaptcha("tok")).resolves.toBe(false);
  });
});
