import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getSubmissionById: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ getSubmissionById: mocks.getSubmissionById }));

import * as route from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("/api/admin/submissions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns 200 / 404 / 400", async () => {
    mocks.getSubmissionById.mockResolvedValue({ id: 1, email: "a@b.c" });
    expect((await route.GET(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.getSubmissionById.mockResolvedValue(null);
    expect((await route.GET(new Request("http://localhost"), ctx("1"))).status).toBe(404);
    expect((await route.GET(new Request("http://localhost"), ctx("x"))).status).toBe(400);
  });

  it("GET is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await route.GET(new Request("http://localhost"), ctx("1"))).status).toBe(401);
  });

  it("is read-only: no write verbs exported", () => {
    expect("PUT" in route).toBe(false);
    expect("DELETE" in route).toBe(false);
  });
});
