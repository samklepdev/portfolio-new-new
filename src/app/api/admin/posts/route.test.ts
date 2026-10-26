import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlugConflictError } from "@/db/content-write";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listPosts: vi.fn(),
  upsertPostWithTags: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ listPosts: mocks.listPosts }));
vi.mock("@/db/content-write", async () => {
  const actual = await vi.importActual<typeof import("@/db/content-write")>("@/db/content-write");
  return { SlugConflictError: actual.SlugConflictError, upsertPostWithTags: mocks.upsertPostWithTags };
});

import { GET, POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/admin/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns the post list", async () => {
    mocks.listPosts.mockResolvedValue([{ id: 1, slug: "p" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, slug: "p" }]);
  });

  it("POST creates a post and returns 201", async () => {
    mocks.upsertPostWithTags.mockResolvedValue({ id: 3, slug: "p" });
    const res = await POST(post({ slug: "p", title: "P", excerpt: "e" }));
    expect(res.status).toBe(201);
    expect(mocks.upsertPostWithTags).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "p", title: "P", excerpt: "e" }),
      { onSlugConflict: "reject" },
    );
  });

  it("POST returns 409 when the slug already exists", async () => {
    mocks.upsertPostWithTags.mockRejectedValue(new SlugConflictError("slug exists"));
    const res = await POST(post({ slug: "p", title: "P", excerpt: "e" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/slug/i);
  });

  it("POST passes onSlugConflict: reject to the write path", async () => {
    mocks.upsertPostWithTags.mockResolvedValue({ id: 3, slug: "p" });
    await POST(post({ slug: "p", title: "P", excerpt: "e" }));
    expect(mocks.upsertPostWithTags).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "p" }),
      { onSlugConflict: "reject" },
    );
  });

  it("POST rejects a bad body with 400", async () => {
    const res = await POST(post({ slug: "p", title: "P" })); // no excerpt
    expect(res.status).toBe(400);
    expect(mocks.upsertPostWithTags).not.toHaveBeenCalled();
  });

  it("GET is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
  });
});
