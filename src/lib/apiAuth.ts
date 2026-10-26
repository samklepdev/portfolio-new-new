import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/adminSession";

/**
 * Defense in depth over the Edge middleware: every /api/admin route re-checks
 * the session so a stray `matcher` edit can never leave a route open.
 */
export async function requireAdmin(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
