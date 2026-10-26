import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { listSubmissions } from "@/db/admin-queries";

// Read-only by design: contact submissions are never created/edited/deleted
// through the admin. Only GET is exported.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listSubmissions());
}
