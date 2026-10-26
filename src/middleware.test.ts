// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { signSession, SESSION_COOKIE } from "@/lib/adminSession";
import { middleware, config } from "./middleware";

const SECRET = "test-secret-key-at-least-32-bytes-long!!";

function request(path: string, token?: string): NextRequest {
  const headers = new Headers();
  if (token) headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  return new NextRequest(new URL(`http://localhost${path}`), { headers });
}

describe("admin middleware", () => {
  beforeEach(() => {
    process.env.ADMIN_JWT_SECRET = SECRET;
  });

  it("matches /admin and /api/admin paths", () => {
    expect(config.matcher).toEqual(["/admin/:path*", "/api/admin/:path*"]);
  });

  it("lets the login page through without a cookie", async () => {
    const res = await middleware(request("/admin/login"));
    expect(res.status).toBe(200); // NextResponse.next()
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets the login API through without a cookie", async () => {
    const res = await middleware(request("/api/admin/login"));
    expect(res.status).toBe(200);
  });

  it("redirects an unauthenticated page request to /admin/login with from", async () => {
    const res = await middleware(request("/admin"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("/admin/login");
    expect(location).toContain("from=%2Fadmin");
  });

  it("returns 401 JSON for an unauthenticated API request", async () => {
    const res = await middleware(request("/api/admin/projects"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("passes a request carrying a valid session cookie", async () => {
    const token = await signSession();
    const res = await middleware(request("/admin/projects", token));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects when the cookie is present but invalid", async () => {
    const res = await middleware(request("/admin", "garbage-token"));
    expect(res.status).toBe(307);
  });

  it("sets Cache-Control: no-store on an authenticated admin page response", async () => {
    const token = await signSession();
    const res = await middleware(request("/admin", token));
    expect(res.status).toBe(200); // NextResponse.next()
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("sets Cache-Control: no-store on an authenticated admin API response", async () => {
    const token = await signSession();
    const res = await middleware(request("/api/admin/projects", token));
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("does not set no-store on the public login page pass-through", async () => {
    const res = await middleware(request("/admin/login"));
    expect(res.headers.get("cache-control")).toBeNull();
  });
});
