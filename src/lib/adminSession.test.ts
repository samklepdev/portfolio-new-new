/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signSession, verifySession, SESSION_COOKIE, SESSION_MAX_AGE } from "./adminSession";

const SECRET = "test-secret-key-at-least-32-bytes-long!!";

describe("adminSession", () => {
  beforeEach(() => {
    process.env.ADMIN_JWT_SECRET = SECRET;
  });

  it("exposes the cookie name and 12h max-age", () => {
    expect(SESSION_COOKIE).toBe("admin_session");
    expect(SESSION_MAX_AGE).toBe(43200);
  });

  it("round-trips a signed session", async () => {
    const token = await signSession();
    expect(await verifySession(token)).toBe(true);
  });

  it("rejects a missing token", async () => {
    expect(await verifySession(undefined)).toBe(false);
    expect(await verifySession("")).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession();
    expect(await verifySession(token + "x")).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const foreign = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("a-completely-different-secret-key-value"));
    expect(await verifySession(foreign)).toBe(false);
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(expired)).toBe(false);
  });

  it("rejects a valid token whose subject is not admin", async () => {
    const wrongSub = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("someone-else")
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(wrongSub)).toBe(false);
  });
});
