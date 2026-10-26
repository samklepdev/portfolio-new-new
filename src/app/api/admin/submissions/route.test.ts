import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listSubmissions: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ listSubmissions: mocks.listSubmissions }));

import * as route from "./route";

describe("/api/admin/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns submissions", async () => {
    mocks.listSubmissions.mockResolvedValue([{ id: 1, email: "a@b.c" }]);
    const res = await route.GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, email: "a@b.c" }]);
  });

  it("GET is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await route.GET()).status).toBe(401);
  });

  it("is read-only: no write verbs exported", () => {
    expect("POST" in route).toBe(false);
    expect("PUT" in route).toBe(false);
    expect("DELETE" in route).toBe(false);
  });
});
