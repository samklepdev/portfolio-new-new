import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedPost } from "@/db/queries";

const mocks = vi.hoisted(() => ({
  getPostBySlug: vi.fn(),
  getPublishedPosts: vi.fn(),
  getPostContent: vi.fn(),
  getContentSlugs: vi.fn(),
  resolvePublicImage: vi.fn(),
}));

vi.mock("@/db/queries", () => ({
  getPostBySlug: mocks.getPostBySlug,
  getPublishedPosts: mocks.getPublishedPosts,
}));

vi.mock("@/lib/content", () => ({
  getPostContent: mocks.getPostContent,
  getContentSlugs: mocks.getContentSlugs,
  resolvePublicImage: mocks.resolvePublicImage,
}));

// MDXRemote is an async server component; testing-library cannot resolve it
// inside a rendered tree, so it is stubbed to echo its source.
vi.mock("next-mdx-remote/rsc", () => ({
  MDXRemote: ({ source }: { source: string }) => <div data-testid="mdx">{source}</div>,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import BlogPostPage, { generateStaticParams } from "./page";

const post: PublishedPost = {
  id: 1,
  slug: "hello-world",
  title: "Hello World",
  excerpt: "A short summary.",
  status: "published",
  featured: false,
  publishedAt: "2026-09-11",
  coverImage: null,
  readingMinutes: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  postTags: [{ tag: { id: 3, name: "Next", kind: "topic", iconUrl: null } }],
} as PublishedPost;

const renderPage = async (slug: string) =>
  render(await BlogPostPage({ params: Promise.resolve({ slug }) }));

describe("BlogPostPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePublicImage.mockResolvedValue(null);
  });

  it("renders the post header and body", async () => {
    mocks.getPostBySlug.mockResolvedValue(post);
    mocks.getPostContent.mockResolvedValue({ body: "Body text.", frontmatter: {} });

    await renderPage("hello-world");

    expect(screen.getByRole("heading", { level: 1, name: "Hello World" })).toBeInTheDocument();
    expect(screen.getByText(/September 11, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/4 min read/)).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByTestId("mdx")).toHaveTextContent("Body text.");
  });

  it("links back to the blog index", async () => {
    mocks.getPostBySlug.mockResolvedValue(post);
    mocks.getPostContent.mockResolvedValue({ body: "x", frontmatter: {} });

    await renderPage("hello-world");
    expect(screen.getByRole("link", { name: /Blog/ })).toHaveAttribute("href", "/blog");
  });

  it("404s when the row is missing", async () => {
    mocks.getPostBySlug.mockResolvedValue(undefined);
    mocks.getPostContent.mockResolvedValue({ body: "x", frontmatter: {} });
    await expect(renderPage("nope")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s when the row is a draft", async () => {
    mocks.getPostBySlug.mockResolvedValue({ ...post, status: "draft" });
    mocks.getPostContent.mockResolvedValue({ body: "x", frontmatter: {} });
    await expect(renderPage("hello-world")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s when the MDX file is missing", async () => {
    mocks.getPostBySlug.mockResolvedValue(post);
    mocks.getPostContent.mockResolvedValue(null);
    await expect(renderPage("hello-world")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("generateStaticParams", () => {
  it("only prerenders slugs that have both a row and a file", async () => {
    mocks.getPublishedPosts.mockResolvedValue([
      { ...post, slug: "has-file" },
      { ...post, slug: "row-only" },
    ]);
    mocks.getContentSlugs.mockResolvedValue(["has-file", "file-only"]);

    expect(await generateStaticParams()).toEqual([{ slug: "has-file" }]);
  });
});
