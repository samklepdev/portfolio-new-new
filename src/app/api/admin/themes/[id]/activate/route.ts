import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId } from "@/lib/validateAdmin";
import { activateTheme } from "@/db/content-write";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const ok = await activateTheme(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateTag("active-theme");
  return NextResponse.json({ ok: true });
}
