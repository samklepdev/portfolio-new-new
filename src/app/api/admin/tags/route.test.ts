import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listTags: vi.fn(),
  upsertTag: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ listTags: mocks.listTags }));
vi.mock("@/db/content-write", () => ({ upsertTag: mocks.upsertTag }));

import { GET, POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/admin/tags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns the tag list", async () => {
    mocks.listTags.mockResolvedValue([{ id: 1, name: "React", kind: "tech" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, name: "React", kind: "tech" }]);
  });

  it("POST creates a tag and returns 201", async () => {
    mocks.upsertTag.mockResolvedValue({ id: 2, name: "Vue", kind: "tech" });
    const res = await POST(post({ name: "Vue", kind: "tech" }));
    expect(res.status).toBe(201);
    expect(mocks.upsertTag).toHaveBeenCalledWith(expect.objectContaining({ name: "Vue", kind: "tech" }));
  });

  it("POST rejects a bad kind with 400", async () => {
    const res = await POST(post({ name: "Vue", kind: "nope" }));
    expect(res.status).toBe(400);
    expect(mocks.upsertTag).not.toHaveBeenCalled();
  });

  it("GET is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
  });
});
