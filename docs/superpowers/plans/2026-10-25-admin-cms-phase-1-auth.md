# Admin CMS — Phase 1: Auth & Middleware — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate everything under `/admin` and `/api/admin` behind a single-admin password login that issues a signed JWT in an httpOnly cookie, verified by Edge middleware.

**Architecture:** A password (stored as a scrypt hash in env) is checked by a Node-runtime login route handler, which signs a `jose` JWT and sets it as an httpOnly `admin_session` cookie. `src/middleware.ts` runs on the Edge runtime and verifies that cookie on every `/admin/*` page and `/api/admin/*` request — redirecting unauthenticated page requests to `/admin/login` and returning 401 JSON for API requests. The JWT (jose) and password (node:crypto scrypt) logic live in **separate modules** so the Edge middleware never imports `node:crypto`.

**Tech Stack:** Next.js 15.5 (App Router, middleware on Edge) · React 19 · TypeScript · `jose` (Edge-compatible JWT) · `node:crypto` scrypt · vitest + @testing-library/react.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-25-admin-cms-design.md` (Phase 1 section).
- **Runtime split (load-bearing):** middleware is Edge — it may import ONLY `src/lib/adminSession.ts` (jose). `node:crypto` scrypt lives in `src/lib/adminPassword.ts` and may be imported ONLY by the Node-runtime login route, never by middleware or anything middleware imports. `jose`, not `jsonwebtoken` (jsonwebtoken is not Edge-compatible).
- Secrets come from env, read at **request time** (never at module import) so a missing secret degrades to a 500/redirect, never a build/import crash: `ADMIN_JWT_SECRET` (JWT signing) and `ADMIN_PASSWORD_HASH` (scrypt `salt:hash`).
- The session cookie is named **`admin_session`**, and is `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` only in production (`process.env.NODE_ENV === "production"`), `maxAge` 12h. Never read or set the token from client JS.
- Styling is **CSS Modules, never Tailwind**. Everything under `/admin` carries `robots: { index: false }`.
- Test runner is **vitest**: run a file with `npx vitest run <path>`. There are **5 pre-existing failing tests** (`src/components/about/Timeline.test.tsx` + `src/app/about/page.test.tsx`, a timeline-date bug unrelated to this work) — the gate per task is new tests pass AND total failures stay exactly 5.
- Never `npm run build` while `next dev` runs — use `npm run build:verify` (isolated `.next-verify` dir); DB up first (`npm run db:up`).
- `npx tsx -e "<top-level await>"` fails in this repo (CJS); use an async IIFE or a `.mts` file for one-off checks. Script *files* are fine.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- There is unrelated WIP in the tree: untracked `src/services/` and `src/content/posts/pi-hosted-*.md`. Do NOT stage, modify, or revert it. Use explicit pathspecs on every `git add` — never `git add -A`.

## File Structure

- `src/lib/adminSession.ts` — jose JWT sign/verify + cookie constants (Edge-safe). **New.**
- `src/lib/adminPassword.ts` — scrypt hash/verify (Node only). **New.**
- `src/lib/hashAdminPassword.ts` — CLI to generate a hash for `.env` (`npm run admin:hash`). **New.**
- `src/app/api/admin/login/route.ts` — POST: verify password, set cookie. **New.**
- `src/app/api/admin/logout/route.ts` — POST: clear cookie. **New.**
- `src/middleware.ts` — the gate. **New.**
- `src/app/admin/layout.tsx` + `layout.module.css` — slim admin shell, `noindex`. **New.**
- `src/app/admin/page.tsx` — minimal signed-in landing stub (Phase 3 fills it in). **New.**
- `src/app/admin/LogoutButton.tsx` — client logout button. **New.**
- `src/app/admin/login/page.tsx` + `page.module.css` — login form. **New.**
- `.env.example` — add the two admin keys. **Modify.**
- `package.json` — add `admin:hash` script. **Modify.**

---

### Task 1: Session module — jose sign/verify (Edge-safe)

**Files:**
- Create: `src/lib/adminSession.ts`
- Test: `src/lib/adminSession.test.ts`
- Modify: `package.json` (add `jose` dependency via install)

**Interfaces:**
- Produces:
  - `const SESSION_COOKIE = "admin_session"` and `const SESSION_MAX_AGE = 43200` (12h, seconds).
  - `async function signSession(): Promise<string>` — signs an HS256 JWT with `sub: "admin"`, issued-at, 12h expiry, using `process.env.ADMIN_JWT_SECRET`. Throws if the secret is unset.
  - `async function verifySession(token: string | undefined): Promise<boolean>` — returns true only for a valid, unexpired HS256 token with `sub === "admin"`; false for missing/invalid/expired/tampered (never throws). Reads `process.env.ADMIN_JWT_SECRET` at call time.
- This module imports ONLY `jose` — no `node:crypto`, no DB. It is the only auth module middleware may import.

- [ ] **Step 1: Install `jose`**

Run: `npm install jose`
Expected: `jose` added to `package.json` dependencies and `package-lock.json` updated. (Both files are committed in Step 6.)

- [ ] **Step 2: Write the failing test**

Create `src/lib/adminSession.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/adminSession.test.ts`
Expected: FAIL — cannot resolve `./adminSession`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/adminSession.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours, in seconds

function secretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error("ADMIN_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    return payload.sub === "admin";
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/adminSession.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/adminSession.ts src/lib/adminSession.test.ts package.json package-lock.json
git commit -m "Add admin session module (jose JWT sign/verify)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Password module — scrypt hash/verify + hash CLI + env docs

**Files:**
- Create: `src/lib/adminPassword.ts`
- Create: `src/lib/hashAdminPassword.ts`
- Test: `src/lib/adminPassword.test.ts`
- Modify: `.env.example`, `package.json` (add `admin:hash` script)

**Interfaces:**
- Produces:
  - `function hashPassword(password: string): string` — returns `"<salthex>:<hashhex>"` using `scryptSync(password, salt, 64)` with a 16-byte random salt.
  - `function verifyPassword(password: string, stored: string): boolean` — constant-time compare against a stored `"salt:hash"`; returns false for malformed input, never throws.
- This module imports `node:crypto` and must NEVER be imported by middleware or `adminSession.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/adminPassword.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./adminPassword";

describe("adminPassword", () => {
  it("verifies a correct password against its own hash", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", stored)).toBe(false);
  });

  it("produces a salt:hash shape with a unique salt each call", () => {
    const a = hashPassword("same");
    const b = hashPassword("same");
    expect(a).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(a).not.toBe(b); // random salt
    expect(verifyPassword("same", a)).toBe(true);
    expect(verifyPassword("same", b)).toBe(true);
  });

  it("returns false (never throws) for malformed stored values", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "no-colon")).toBe(false);
    expect(verifyPassword("x", "salt:")).toBe(false);
    expect(verifyPassword("x", ":hash")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/adminPassword.test.ts`
Expected: FAIL — cannot resolve `./adminPassword`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/adminPassword.ts`:

```ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  let hashBuf: Buffer;
  try {
    hashBuf = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (hashBuf.length !== KEYLEN) return false;

  const test = scryptSync(password, salt, KEYLEN);
  return timingSafeEqual(test, hashBuf);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/adminPassword.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the hash-generation CLI**

Create `src/lib/hashAdminPassword.ts`:

```ts
import { hashPassword } from "./adminPassword";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run admin:hash -- "<your password>"');
  process.exit(1);
}

console.log(hashPassword(password));
```

In `package.json` `scripts`, add after `"db:studio"`:

```json
    "db:studio": "drizzle-kit studio",
    "admin:hash": "tsx src/lib/hashAdminPassword.ts"
```

(Add a comma after the `db:studio` line.)

- [ ] **Step 6: Document the env vars**

Append to `.env.example`:

```
# Admin section (single admin). Generate the hash with:
#   npm run admin:hash -- "your-password"
# and set a long random string for the JWT secret (e.g. `openssl rand -hex 32`).
ADMIN_PASSWORD_HASH=
ADMIN_JWT_SECRET=
```

- [ ] **Step 7: Verify the CLI prints a valid hash**

Run: `npm run admin:hash -- "hunter2"`
Expected: prints one `salt:hash` line matching `^[0-9a-f]{32}:[0-9a-f]{128}$`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/adminPassword.ts src/lib/adminPassword.test.ts src/lib/hashAdminPassword.ts package.json .env.example
git commit -m "Add admin password hashing (scrypt) + hash CLI

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Login & logout route handlers

**Files:**
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`
- Test: `src/app/api/admin/login/route.test.ts`
- Test: `src/app/api/admin/logout/route.test.ts`

**Interfaces:**
- Consumes: `verifyPassword` (Task 2); `signSession`, `SESSION_COOKIE`, `SESSION_MAX_AGE` (Task 1).
- Produces: `POST` handlers. Login: `200 {ok:true}` + sets `admin_session` cookie on correct password; `401 {error}` on wrong password; `400 {error}` on a non-JSON/invalid body; `500 {error}` when env is unconfigured. Logout: `200 {ok:true}` + clears the cookie (`maxAge: 0`).

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/admin/login/route.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/adminPassword";
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
});
```

Create `src/app/api/admin/logout/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/admin/logout", () => {
  it("clears the admin_session cookie", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("admin_session");
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/api/admin/login/route.test.ts" "src/app/api/admin/logout/route.test.ts"`
Expected: FAIL — cannot resolve `./route` in both.

- [ ] **Step 3: Write the login handler**

Create `src/app/api/admin/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/adminPassword";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/adminSession";

export async function POST(request: Request) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!hash || !secret) {
    return NextResponse.json({ error: "Admin auth is not configured" }, { status: 500 });
  }

  let password: unknown;
  try {
    const body = await request.json();
    password = (body as { password?: unknown } | null)?.password;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof password !== "string" || !verifyPassword(password, hash)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await signSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
```

- [ ] **Step 4: Write the logout handler**

Create `src/app/api/admin/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/adminSession";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run "src/app/api/admin/login/route.test.ts" "src/app/api/admin/logout/route.test.ts"`
Expected: PASS (4 + 1 = 5 tests).

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/admin/login/route.ts" "src/app/api/admin/login/route.test.ts" "src/app/api/admin/logout/route.ts" "src/app/api/admin/logout/route.test.ts"
git commit -m "Add admin login/logout route handlers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The middleware gate

**Files:**
- Create: `src/middleware.ts`
- Test: `src/middleware.test.ts`

**Interfaces:**
- Consumes: `verifySession`, `SESSION_COOKIE` (Task 1).
- Produces: `async function middleware(request: NextRequest)` and `const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] }`. Behavior: `/admin/login` and `/api/admin/login` always pass through; a valid cookie passes through (`NextResponse.next()`); otherwise `/api/admin/*` → `401 {error}` JSON and `/admin/*` pages → 307 redirect to `/admin/login?from=<pathname>`.

- [ ] **Step 1: Write the failing test**

Create `src/middleware.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/middleware.test.ts`
Expected: FAIL — cannot resolve `./middleware`.

- [ ] **Step 3: Write the middleware**

Create `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/adminSession";

// The login endpoints must stay reachable while unauthenticated, or there is
// no way in. Everything else under /admin and /api/admin requires a session.
const PUBLIC_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) return NextResponse.next();

  // API callers get a machine-readable 401 (so the service layer can surface it);
  // page requests get redirected to the login screen.
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/middleware.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts
git commit -m "Add Edge middleware gating /admin and /api/admin

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Login page + minimal admin shell

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/layout.module.css`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/LogoutButton.tsx`
- Create: `src/app/admin/login/page.tsx`, `src/app/admin/login/page.module.css`
- Test: `src/app/admin/login/page.test.tsx`

**Interfaces:**
- Consumes: the `POST /api/admin/login` and `POST /api/admin/logout` routes (Task 3), reached via `fetch`.
- Produces: the `/admin/login` form and a minimal authenticated `/admin` landing (Phase 3 replaces the landing with the real dashboard). The admin layout sets `robots: { index: false }`.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/login/page.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import AdminLoginPage from "./page";

describe("AdminLoginPage", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
    vi.stubGlobal("fetch", vi.fn());
    window.history.replaceState({}, "", "/admin/login");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("navigates to /admin on a successful login", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({ ok: true });
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an error and does not navigate on a failed login", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Incorrect password" }),
    });
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Incorrect password")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/login/page.test.tsx"`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Write the login page**

Create `src/app/admin/login/page.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // Read ?from only on the client to avoid a Suspense boundary for useSearchParams.
      const from = new URLSearchParams(window.location.search).get("from");
      router.push(from && from.startsWith("/admin") ? from : "/admin");
      router.refresh();
      return;
    }

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "Login failed");
    setPending(false);
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit}>
        <h1 className={styles.title}>Admin</h1>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
```

Create `src/app/admin/login/page.module.css`:

```css
.page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: #0b0e14;
}

.card {
  width: min(22rem, 100%);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 2rem;
  border: 1px solid rgba(0, 240, 255, 0.15);
  border-radius: 0.75rem;
  background: #12161f;
}

.title {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  color: #f5f7fa;
}

.label {
  font-size: 0.85rem;
  color: #aab2c0;
}

.input {
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.5rem;
  background: #0b0e14;
  color: #f5f7fa;
  font: inherit;
}

.input:focus-visible {
  outline: 2px solid #00f0ff;
  outline-offset: 2px;
}

.error {
  margin: 0;
  font-size: 0.85rem;
  color: #ff2e97;
}

.button {
  margin-top: 0.5rem;
  padding: 0.6rem 0.75rem;
  border: none;
  border-radius: 0.5rem;
  background: #00f0ff;
  color: #04121a;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.button:disabled {
  opacity: 0.6;
  cursor: default;
}
```

- [ ] **Step 4: Write the admin shell (layout + landing + logout)**

Create `src/app/admin/layout.tsx`:

```tsx
import type { Metadata } from "next";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Admin — Sam Klepper",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
```

Create `src/app/admin/layout.module.css`:

```css
.shell {
  min-height: 100dvh;
  background: #0b0e14;
  color: #f5f7fa;
}
```

Create `src/app/admin/page.tsx`:

```tsx
import LogoutButton from "./LogoutButton";

export default function AdminHome() {
  return (
    <main style={{ maxWidth: "48rem", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ marginTop: 0 }}>Admin</h1>
      <p>You are signed in. The dashboard lands in Phase 3.</p>
      <LogoutButton />
    </main>
  );
}
```

Create `src/app/admin/LogoutButton.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
```

- [ ] **Step 5: Run the login page test to verify it passes**

Run: `npx vitest run "src/app/admin/login/page.test.tsx"`
Expected: PASS (2 tests).

- [ ] **Step 6: Full verification (suite + build)**

First ensure `.env` has dev values so the running app works (local only — `.env` is gitignored, do NOT commit it):
```bash
printf '\nADMIN_PASSWORD_HASH=%s\nADMIN_JWT_SECRET=%s\n' "$(npm run --silent admin:hash -- "devpassword")" "dev-only-jwt-secret-at-least-32-bytes!!" >> .env
```

Then:
```bash
npm run db:up && npx vitest run && npm run build:verify
```
Expected: vitest reports the new Phase 1 tests passing with total failures still exactly the 5 pre-existing ones; `build:verify` completes with no error (middleware compiles for the Edge runtime; `/admin/login` and `/admin` build as dynamic routes). Do not run plain `npm run build` while `next dev` is up.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/layout.tsx" "src/app/admin/layout.module.css" "src/app/admin/page.tsx" "src/app/admin/LogoutButton.tsx" "src/app/admin/login/page.tsx" "src/app/admin/login/page.module.css" "src/app/admin/login/page.test.tsx"
git commit -m "Add admin login page and minimal authenticated shell

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Phase 1 section):**
- `ADMIN_PASSWORD_HASH` (scrypt) + `ADMIN_JWT_SECRET` env, documented → Task 2. ✅
- `/admin/login` client form → `POST /api/admin/login` → Tasks 5 & 3. ✅
- Login verifies password, signs a 12h `jose` JWT, sets httpOnly/Secure/SameSite=Lax `admin_session` cookie → Tasks 1 & 3. ✅
- `POST /api/admin/logout` clears the cookie → Task 3. ✅
- `src/middleware.ts` with matcher `/admin/:path*` + `/api/admin/:path*`, excluding the login endpoints; invalid/expired/missing → page redirect to `/admin/login?from=…`, API → 401 JSON → Task 4. ✅
- Edge-compatible verify (`jose`) with the node:crypto split so middleware never imports it → Tasks 1, 2, 4 (separate modules; middleware imports only `adminSession`). ✅
- httpOnly cookie auto-sent; service layer never touches the token → cookie set server-side, read only by middleware/route (no client read anywhere). ✅
- Everything under `/admin` is `noindex` → Task 5 layout metadata. ✅
- Defense-in-depth per-route auth check: Phase 1 has no protected `/api/admin` resource routes yet (only the public login/logout); the reusable `verifySession` is in place and Phase 2's resource routes will each call it. Noted, not a gap for this phase. ✅

**Placeholder scan:** No TBD/TODO; every code step has complete code; every command has an expected result. ✅

**Type consistency:** `SESSION_COOKIE`/`SESSION_MAX_AGE`/`signSession`/`verifySession` (Task 1) are used with matching names/signatures in Tasks 3 and 4. `hashPassword`/`verifyPassword` (Task 2) match their use in Task 3's login route and tests. Cookie options (`httpOnly`, `sameSite: "lax"`, `maxAge`) are identical across login/logout. The login page posts to the exact routes Task 3 defines. ✅

**Note for the implementer:** Task 1 must land before Tasks 3–4 (they import `adminSession`); Task 2 before Task 3 (login imports `adminPassword`). Execute in order. The `.env` edit in Task 5 Step 6 is local-only and must never be committed (it is gitignored).
