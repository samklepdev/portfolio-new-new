import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listProjects: vi.fn(),
  upsertProjectWithTags: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ listProjects: mocks.listProjects }));
vi.mock("@/db/content-write", () => ({ upsertProjectWithTags: mocks.upsertProjectWithTags }));

import { GET, POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/admin/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns the project list", async () => {
    mocks.listProjects.mockResolvedValue([{ id: 1, slug: "a" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, slug: "a" }]);
  });

  it("GET is 401 when unauthenticated (defense in depth)", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.listProjects).not.toHaveBeenCalled();
  });

  it("POST creates a project and returns 201", async () => {
    mocks.upsertProjectWithTags.mockResolvedValue({ id: 9, slug: "demo" });
    const res = await POST(post({ slug: "demo", title: "Demo", summary: "s" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 9, slug: "demo" });
    expect(mocks.upsertProjectWithTags).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "demo", title: "Demo", status: "published" }),
    );
  });

  it("POST rejects a bad body with 400 and does not write", async () => {
    const res = await POST(post({ slug: "demo" })); // no title/summary
    expect(res.status).toBe(400);
    expect(mocks.upsertProjectWithTags).not.toHaveBeenCalled();
  });

  it("POST is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    const res = await POST(post({ slug: "demo", title: "D", summary: "s" }));
    expect(res.status).toBe(401);
  });
});
