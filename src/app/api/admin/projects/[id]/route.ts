import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId, parseProjectInput } from "@/lib/validateAdmin";
import { getProjectById } from "@/db/admin-queries";
import { upsertProjectWithTags, deleteProjectById } from "@/db/content-write";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badId = () => NextResponse.json({ error: "Invalid id" }, { status: 400 });

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const row = await getProjectById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseProjectInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const row = await upsertProjectWithTags({ ...parsed.value, id });
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const deleted = await deleteProjectById(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
