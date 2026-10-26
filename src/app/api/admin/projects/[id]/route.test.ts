import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getProjectById: vi.fn(),
  upsertProjectWithTags: vi.fn(),
  deleteProjectById: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ getProjectById: mocks.getProjectById }));
vi.mock("@/db/content-write", () => ({
  upsertProjectWithTags: mocks.upsertProjectWithTags,
  deleteProjectById: mocks.deleteProjectById,
}));

import { GET, PUT, DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function put(body: unknown): Request {
  return new Request("http://localhost/api/admin/projects/1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns 200 with the row", async () => {
    mocks.getProjectById.mockResolvedValue({ id: 1, slug: "a" });
    const res = await GET(new Request("http://localhost"), ctx("1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1, slug: "a" });
  });

  it("GET returns 404 when missing", async () => {
    mocks.getProjectById.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("GET returns 400 on a bad id", async () => {
    const res = await GET(new Request("http://localhost"), ctx("abc"));
    expect(res.status).toBe(400);
    expect(mocks.getProjectById).not.toHaveBeenCalled();
  });

  it("PUT updates by id and returns 200", async () => {
    mocks.upsertProjectWithTags.mockResolvedValue({ id: 1, slug: "demo" });
    const res = await PUT(put({ slug: "demo", title: "D", summary: "s" }), ctx("1"));
    expect(res.status).toBe(200);
    expect(mocks.upsertProjectWithTags).toHaveBeenCalledWith(expect.objectContaining({ id: 1, slug: "demo" }));
  });

  it("PUT returns 404 when the row does not exist", async () => {
    mocks.upsertProjectWithTags.mockRejectedValue(new Error("Project 1 not found"));
    const res = await PUT(put({ slug: "demo", title: "D", summary: "s" }), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("PUT rejects a bad body with 400", async () => {
    const res = await PUT(put({ slug: "demo" }), ctx("1"));
    expect(res.status).toBe(400);
  });

  it("DELETE returns 200 when a row was removed", async () => {
    mocks.deleteProjectById.mockResolvedValue(true);
    const res = await DELETE(new Request("http://localhost"), ctx("1"));
    expect(res.status).toBe(200);
  });

  it("DELETE returns 404 when nothing was removed", async () => {
    mocks.deleteProjectById.mockResolvedValue(false);
    const res = await DELETE(new Request("http://localhost"), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("every method is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(401);
    expect((await PUT(put({}), ctx("1"))).status).toBe(401);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(401);
  });
});
