import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getTagById: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ getTagById: mocks.getTagById }));
vi.mock("@/db/content-write", () => ({ updateTag: mocks.updateTag, deleteTag: mocks.deleteTag }));

import { GET, PUT, DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function put(body: unknown): Request {
  return new Request("http://localhost/api/admin/tags/1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/tags/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns 200 / 404 / 400", async () => {
    mocks.getTagById.mockResolvedValue({ id: 1, name: "React", kind: "tech" });
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.getTagById.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(404);
    expect((await GET(new Request("http://localhost"), ctx("x"))).status).toBe(400);
  });

  it("PUT updates and returns 200, 404 when missing", async () => {
    mocks.updateTag.mockResolvedValue({ id: 1, name: "React", kind: "tech" });
    expect((await PUT(put({ name: "React", kind: "tech" }), ctx("1"))).status).toBe(200);
    mocks.updateTag.mockResolvedValue(null);
    expect((await PUT(put({ name: "React", kind: "tech" }), ctx("1"))).status).toBe(404);
  });

  it("PUT rejects a bad body with 400", async () => {
    expect((await PUT(put({ name: "x", kind: "bogus" }), ctx("1"))).status).toBe(400);
  });

  it("DELETE returns 200 / 404", async () => {
    mocks.deleteTag.mockResolvedValue(true);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.deleteTag.mockResolvedValue(false);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(404);
  });

  it("every method is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(401);
    expect((await PUT(put({}), ctx("1"))).status).toBe(401);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(401);
  });
});
