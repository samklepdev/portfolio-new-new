/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/adminPassword";
import { resetRateLimitStore } from "@/lib/rateLimit";
import { POST } from "./route";

const SECRET = "test-secret-key-at-least-32-bytes-long!!";

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    resetRateLimitStore();
    process.env.ADMIN_JWT_SECRET = SECRET;
    process.env.ADMIN_PASSWORD_HASH = hashPassword("letmein");
  });

  it("sets an httpOnly admin_session cookie on the correct password", async () => {
    const res = await POST(req({ password: "letmein" }));
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("admin_session");
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });

  it("returns 401 and no cookie on the wrong password", async () => {
    const res = await POST(req({ password: "nope" }));
    expect(res.status).toBe(401);
    expect(res.cookies.get("admin_session")).toBeUndefined();
  });

  it("returns 401 on a non-string password (not 400 — the body is valid JSON)", async () => {
    const res = await POST(req({ password: 123 }));
    expect(res.status).toBe(401); // valid JSON but non-string password fails verification → 401
    expect(res.cookies.get("admin_session")).toBeUndefined();
  });

  it("returns 500 when admin auth env is unset", async () => {
    delete process.env.ADMIN_PASSWORD_HASH;
    const res = await POST(req({ password: "letmein" }));
    expect(res.status).toBe(500);
  });

  it("returns 429 after too many attempts from one IP", async () => {
    function attempt() {
      return POST(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.9" },
          body: JSON.stringify({ password: "nope" }),
        }),
      );
    }
    for (let i = 0; i < 10; i += 1) {
      const res = await attempt();
      expect(res.status).toBe(401);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
