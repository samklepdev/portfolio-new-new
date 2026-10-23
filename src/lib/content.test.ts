import { describe, expect, it } from "vitest";
import { getContent, getContentSlugs, getPostContent } from "./content";

describe("getContentSlugs", () => {
  it("scopes to the requested collection", async () => {
    const projects = await getContentSlugs("projects");
    expect(projects).toContain("becks-prime");
    expect(projects).not.toContain("hello-world");
  });

  it("returns [] for a collection directory that does not exist yet", async () => {
    const posts = await getContentSlugs("posts");
    expect(Array.isArray(posts)).toBe(true);
  });

  it("only lists .md files, never stray .tsx", async () => {
    const slugs = await getContentSlugs("posts");
    expect(slugs).not.toContain("page");
  });
});

describe("getContent", () => {
  it("reads a project file's body and frontmatter", async () => {
    const content = await getContent("projects", "becks-prime");
    expect(content).not.toBeNull();
    expect(content!.frontmatter.title).toBe("Becks Prime");
    expect(typeof content!.body).toBe("string");
  });

  it("returns null for a missing slug", async () => {
    expect(await getContent("projects", "does-not-exist")).toBeNull();
  });

  it("rejects path traversal without touching the filesystem", async () => {
    expect(await getContent("projects", "../../../etc/passwd")).toBeNull();
    expect(await getContent("posts", "..%2F..%2Fsecret")).toBeNull();
    expect(await getPostContent("a/b")).toBeNull();
  });
});
