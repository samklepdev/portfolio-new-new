import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId, parseThemeInput } from "@/lib/validateAdmin";
import { getTheme } from "@/db/admin-queries";
import { NameConflictError, deleteTheme, upsertTheme } from "@/db/content-write";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badId = () => NextResponse.json({ error: "Invalid id" }, { status: 400 });

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const row = await getTheme(id);
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

  const parsed = parseThemeInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const row = await upsertTheme(parsed.value, { id });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Editing the active theme's colours changes the live palette.
    revalidateTag("active-theme");
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof NameConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const deleted = await deleteTheme(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Deleting the active theme falls the site back to default.
  revalidateTag("active-theme");
  return NextResponse.json({ ok: true });
}
