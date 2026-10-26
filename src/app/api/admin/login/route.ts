import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/adminPassword";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/adminSession";
import { rateLimit, clearRateLimit } from "@/lib/rateLimit";

function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "unknown";
}

export async function POST(request: Request) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!hash || !secret) {
    return NextResponse.json({ error: "Admin auth is not configured" }, { status: 500 });
  }

  const key = clientKey(request);
  const limit = rateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
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

  clearRateLimit(key);
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
