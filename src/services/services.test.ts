import { describe, expect, it, vi } from "vitest";

// Reuse the axios mock approach from BaseApiService.test.
const client = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => client),
    isAxiosError: () => false,
  },
}));

import ProjectService from "./ProjectService";
import PostService from "./PostService";
import TagService from "./TagService";
import SubmissionService from "./SubmissionService";

describe("per-resource services", () => {
  it("ProjectService calls the projects endpoint", async () => {
    client.get.mockResolvedValue({ data: [] });
    await new ProjectService().list();
    expect(client.get).toHaveBeenCalledWith("projects");
  });

  it("PostService creates against the posts endpoint", async () => {
    client.post.mockResolvedValue({ data: { id: 1 } });
    await new PostService().save({ slug: "p" } as never);
    expect(client.post).toHaveBeenCalledWith("posts", { slug: "p" });
  });

  it("TagService updates with an encoded id", async () => {
    client.put.mockResolvedValue({ data: { id: 1 } });
    await new TagService().edit("1", { name: "x", kind: "tech", iconUrl: null });
    expect(client.put).toHaveBeenCalledWith("tags/1", { name: "x", kind: "tech", iconUrl: null });
  });

  it("SubmissionService exposes only read convenience methods", () => {
    const svc = new SubmissionService();
    expect(typeof svc.list).toBe("function");
    expect(typeof svc.get).toBe("function");
    expect((svc as unknown as { save?: unknown }).save).toBeUndefined();
    expect((svc as unknown as { edit?: unknown }).edit).toBeUndefined();
  });
});
