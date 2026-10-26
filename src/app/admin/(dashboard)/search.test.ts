import { describe, expect, it } from "vitest";
import {
  buildResultItems,
  filterResults,
  type SearchData,
} from "./search";

const data: SearchData = {
  projects: [
    { id: 1, slug: "alpha", title: "Alpha Portal", status: "published" },
    { id: 2, slug: "beta", title: "Beta Site", status: "draft" },
  ] as SearchData["projects"],
  posts: [
    { id: 5, slug: "hello", title: "Hello World", status: "published" },
  ] as SearchData["posts"],
  tags: [
    { id: 9, name: "React", kind: "tech", iconUrl: null, projectCount: 2, postCount: 0 },
  ] as SearchData["tags"],
  submissions: [
    {
      id: 7, name: "Ada Lovelace", email: "ada@example.com", budget: null,
      website: null, message: "Hi", createdAt: "2026-02-01T00:00:00Z",
      emailedAt: null, emailError: null,
    },
  ] as SearchData["submissions"],
};

describe("buildResultItems", () => {
  it("maps each record to a typed result with the right href and labels", () => {
    const items = buildResultItems(data);
    const byType = (t: string) => items.filter((i) => i.type === t);

    expect(byType("project")).toHaveLength(2);
    expect(items.find((i) => i.id === 1 && i.type === "project")).toMatchObject({
      label: "Alpha Portal",
      sublabel: "/alpha",
      href: "/admin/projects/1/edit",
      key: "project-1",
    });
    expect(items.find((i) => i.type === "post")).toMatchObject({
      label: "Hello World",
      href: "/admin/posts/5/edit",
    });
    // Tags have no per-item page; they link to the list.
    expect(items.find((i) => i.type === "tag")).toMatchObject({
      label: "React",
      sublabel: "tech",
      href: "/admin/tags",
    });
    expect(items.find((i) => i.type === "submission")).toMatchObject({
      label: "Ada Lovelace",
      sublabel: "ada@example.com",
      href: "/admin/submissions/7",
    });
  });
});

describe("filterResults", () => {
  const items = buildResultItems(data);

  it("returns no groups for an empty or whitespace query", () => {
    expect(filterResults(items, "")).toEqual([]);
    expect(filterResults(items, "   ")).toEqual([]);
  });

  it("matches case-insensitively over label and sublabel", () => {
    const groups = filterResults(items, "alpha");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ type: "project", heading: "Projects" });
    expect(groups[0].items.map((i) => i.label)).toEqual(["Alpha Portal"]);

    // sublabel (email) is searchable
    expect(filterResults(items, "example.com")[0].type).toBe("submission");
    // slug is searchable
    expect(filterResults(items, "/beta")[0].items[0].label).toBe("Beta Site");
  });

  it("groups in a fixed order and omits empty groups", () => {
    const broad = filterResults(buildResultItems({ ...data }), "e");
    const order = broad.map((g) => g.type);
    // Only the types that actually matched, but always project→post→tag→submission.
    expect(order).toEqual([...order].sort(
      (a, b) =>
        ["project", "post", "tag", "submission"].indexOf(a) -
        ["project", "post", "tag", "submission"].indexOf(b),
    ));
  });

  it("caps each group and reports the pre-cap total for '+N more'", () => {
    const many: SearchData = {
      ...data,
      projects: Array.from({ length: 7 }, (_, i) => ({
        id: i + 1, slug: `widget-${i}`, title: `Widget ${i}`, status: "published",
      })) as SearchData["projects"],
    };
    const group = filterResults(buildResultItems(many), "widget", 5)[0];
    expect(group.items).toHaveLength(5);
    expect(group.total).toBe(7);
    expect(group.moreHref).toBe("/admin/projects");
  });
});
