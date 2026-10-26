import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseProjectInput } from "@/lib/validateAdmin";
import { listProjects } from "@/db/admin-queries";
import { upsertProjectWithTags } from "@/db/content-write";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  return NextResponse.json(await listProjects());
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseProjectInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = await upsertProjectWithTags(parsed.value);
  return NextResponse.json(row, { status: 201 });
}
