import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedPost } from "@/db/queries";

const mocks = vi.hoisted(() => ({
  getPublishedPostsPage: vi.fn(),
  getFeaturedPosts: vi.fn(),
  getPublishedPostsCount: vi.fn(),
  getPostTagNames: vi.fn(),
}));

vi.mock("@/db/queries", () => mocks);
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import BlogPage from "./page";

function makePost(slug: string, featured = false): PublishedPost {
  return {
    id: slug.length,
    slug,
    title: `Post ${slug}`,
    excerpt: "Summary.",
    status: "published",
    featured,
    publishedAt: "2026-09-11",
    coverImage: null,
    readingMinutes: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    postTags: [],
  } as PublishedPost;
}

function setup({
  posts = [makePost("a")],
  total = 1,
  totalPublished = 1,
  featured = [] as PublishedPost[],
  tagNames = [] as string[],
} = {}) {
  mocks.getPublishedPostsPage.mockResolvedValue({
    posts,
    total,
    totalPages: Math.max(1, Math.ceil(total / 6)),
  });
  mocks.getPublishedPostsCount.mockResolvedValue(totalPublished);
  mocks.getFeaturedPosts.mockResolvedValue(featured);
  mocks.getPostTagNames.mockResolvedValue(tagNames);
}

const render1 = async (params: Record<string, string> = {}) =>
  render(await BlogPage({ searchParams: Promise.resolve(params) }));

describe("BlogPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("has exactly one h1", async () => {
    setup();
    await render1();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Blog" })).toBeInTheDocument();
  });

  it("renders the post rows", async () => {
    setup({ posts: [makePost("a"), makePost("b")], total: 2, totalPublished: 2 });
    await render1();
    expect(screen.getByRole("link", { name: /Post a/ })).toHaveAttribute("href", "/blog/a");
  });

  it("renders tag chips from the tag names", async () => {
    setup({ tagNames: ["Design Systems"] });
    await render1();
    expect(screen.getByRole("link", { name: "Design Systems" })).toHaveAttribute(
      "href",
      "/blog?tag=design-systems"
    );
  });

  it("404s on an unknown tag", async () => {
    setup({ tagNames: ["Next"] });
    await expect(render1({ tag: "nope" })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("passes the resolved tag name through to the query", async () => {
    setup({ tagNames: ["Design Systems"] });
    await render1({ tag: "design-systems" });
    expect(mocks.getPublishedPostsPage).toHaveBeenCalledWith(1, 6, "Design Systems");
  });
});

describe("BlogPage featured band gate", () => {
  beforeEach(() => vi.clearAllMocks());

  const sixPosts = Array.from({ length: 6 }, (_, i) => makePost(`p${i}`));

  it("is absent below FEATURED_MIN_POSTS even with a featured post", async () => {
    setup({ posts: sixPosts.slice(0, 3), total: 3, totalPublished: 3, featured: [makePost("f", true)] });
    await render1();
    expect(screen.queryByRole("heading", { name: "Featured" })).not.toBeInTheDocument();
  });

  it("is absent at the threshold when nothing is featured", async () => {
    setup({ posts: sixPosts, total: 6, totalPublished: 6, featured: [] });
    await render1();
    expect(screen.queryByRole("heading", { name: "Featured" })).not.toBeInTheDocument();
  });

  it("is absent on page 2", async () => {
    setup({ posts: sixPosts, total: 12, totalPublished: 12, featured: [makePost("f", true)] });
    await render1({ page: "2" });
    expect(screen.queryByRole("heading", { name: "Featured" })).not.toBeInTheDocument();
  });

  it("is absent under an active tag filter", async () => {
    setup({ posts: sixPosts, total: 6, totalPublished: 6, featured: [makePost("f", true)], tagNames: ["Next"] });
    await render1({ tag: "next" });
    expect(screen.queryByRole("heading", { name: "Featured" })).not.toBeInTheDocument();
  });

  it("renders when all four conditions hold", async () => {
    setup({ posts: sixPosts, total: 6, totalPublished: 6, featured: [makePost("f", true)] });
    await render1();
    expect(screen.getByRole("heading", { name: "Featured" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Post f/ })).toBeInTheDocument();
  });
});
