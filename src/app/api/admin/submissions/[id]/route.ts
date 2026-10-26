import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId } from "@/lib/validateAdmin";
import { getSubmissionById } from "@/db/admin-queries";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const row = await getSubmissionById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
