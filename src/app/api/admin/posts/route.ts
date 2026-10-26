import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parsePostInput } from "@/lib/validateAdmin";
import { listPosts } from "@/db/admin-queries";
import { upsertPostWithTags } from "@/db/content-write";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  return NextResponse.json(await listPosts());
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parsePostInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = await upsertPostWithTags(parsed.value);
  return NextResponse.json(row, { status: 201 });
}
