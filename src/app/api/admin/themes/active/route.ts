import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { deactivateAllThemes } from "@/db/content-write";

export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deactivateAllThemes();
  revalidateTag("active-theme");
  return NextResponse.json({ ok: true });
}
