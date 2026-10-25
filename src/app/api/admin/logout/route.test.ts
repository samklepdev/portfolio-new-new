import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/admin/logout", () => {
  it("clears the admin_session cookie", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("admin_session");
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
