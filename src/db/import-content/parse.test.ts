import { describe, expect, it } from "vitest";
import { parseProjectRow, parsePostRow } from "./parse";

describe("parseProjectRow", () => {
  const fm = {
    title: "Build-On",
    excerpt: "A summary.",
    category: "Web",
    date: "2025",
    id: "3",
    link: "https://example.com",
    repo: "https://github.com/x/y",
    imageUrl: "/img/cover.png",
    tech1Name: "Next",
    tech1: "/icons/next.svg",
    techDescription: "How it was built.",
    techTabImg: "/img/tech.png",
    techTabImgAlt: "Tech diagram",
    designDescription: "How it looks.",
    designTabImg: "/img/design.png",
    designTabImgAlt: "Design mock",
  };

  it("maps frontmatter + body into a project row including tab columns", () => {
    const row = parseProjectRow("build-on", fm, "# Body\nText.");

    expect(row).toMatchObject({
      slug: "build-on",
      title: "Build-On",
      summary: "A summary.",
      category: "Web",
      dateLabel: "2025",
      sortOrder: 3,
      liveUrl: "https://example.com",
      repoUrl: "https://github.com/x/y",
      coverImage: "/img/cover.png",
      featured: true, // build-on is in FEATURED_PROJECT_SLUGS
      status: "published",
      content: "# Body\nText.",
      techDescription: "How it was built.",
      techTabImage: "/img/tech.png",
      techTabImageAlt: "Tech diagram",
      designDescription: "How it looks.",
      designTabImage: "/img/design.png",
      designTabImageAlt: "Design mock",
    });
    expect(row.tech).toEqual([{ name: "Next", iconUrl: "/icons/next.svg" }]);
  });

  it("nulls absent optional fields and marks non-featured slugs", () => {
    const row = parseProjectRow("misc", { title: "T", excerpt: "E" }, "body");
    expect(row.featured).toBe(false);
    expect(row.category).toBeNull();
    expect(row.techDescription).toBeNull();
    expect(row.tech).toEqual([]);
  });

  it("throws when a required field is missing", () => {
    expect(() => parseProjectRow("x", { title: "Only title" }, "b")).toThrow(/excerpt/);
  });
});

describe("parsePostRow", () => {
  it("maps frontmatter + body and computes reading time", () => {
    const row = parsePostRow(
      "hello",
      { title: "Hello", excerpt: "Hi", publishedAt: "2026-09-11", tags: ["Next", "Pi"] },
      "word ".repeat(400)
    );
    expect(row).toMatchObject({
      slug: "hello",
      title: "Hello",
      excerpt: "Hi",
      publishedAt: "2026-09-11",
      status: "published",
      tags: ["Next", "Pi"],
    });
    expect(row.content).toContain("word");
    expect(row.readingMinutes).toBeGreaterThan(1);
  });

  it("throws when a required field is missing", () => {
    expect(() => parsePostRow("x", { excerpt: "no title" }, "b")).toThrow(/title/);
  });
});
