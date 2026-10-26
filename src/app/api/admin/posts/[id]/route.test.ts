import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getPostById: vi.fn(),
  upsertPostWithTags: vi.fn(),
  deletePostById: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ getPostById: mocks.getPostById }));
vi.mock("@/db/content-write", () => ({
  upsertPostWithTags: mocks.upsertPostWithTags,
  deletePostById: mocks.deletePostById,
}));

import { GET, PUT, DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function put(body: unknown): Request {
  return new Request("http://localhost/api/admin/posts/1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/posts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns 200 / 404 / 400", async () => {
    mocks.getPostById.mockResolvedValue({ id: 1 });
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.getPostById.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(404);
    expect((await GET(new Request("http://localhost"), ctx("x"))).status).toBe(400);
  });

  it("PUT updates by id", async () => {
    mocks.upsertPostWithTags.mockResolvedValue({ id: 1, slug: "p" });
    const res = await PUT(put({ slug: "p", title: "P", excerpt: "e" }), ctx("1"));
    expect(res.status).toBe(200);
    expect(mocks.upsertPostWithTags).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("PUT returns 404 when the row is missing", async () => {
    mocks.upsertPostWithTags.mockRejectedValue(new Error("Post 1 not found"));
    const res = await PUT(put({ slug: "p", title: "P", excerpt: "e" }), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("DELETE returns 200 / 404", async () => {
    mocks.deletePostById.mockResolvedValue(true);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.deletePostById.mockResolvedValue(false);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(404);
  });

  it("every method is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(401);
    expect((await PUT(put({}), ctx("1"))).status).toBe(401);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(401);
  });
});
