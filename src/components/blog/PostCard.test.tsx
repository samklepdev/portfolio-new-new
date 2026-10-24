import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostCard } from "./PostCard";
import type { PublishedPost } from "@/db/queries";

function makePost(overrides: Partial<PublishedPost> = {}): PublishedPost {
  return {
    id: 1,
    slug: "hello-world",
    title: "Hello World",
    excerpt: "A short summary.",
    status: "published",
    featured: true,
    publishedAt: "2026-09-11",
    coverImage: null,
    readingMinutes: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    postTags: [],
    ...overrides,
  } as PublishedPost;
}

describe("PostCard", () => {
  it("links to the post and shows its title", () => {
    render(<PostCard post={makePost()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/blog/hello-world");
    expect(screen.getByRole("heading", { name: "Hello World" })).toBeInTheDocument();
  });

  it("shows the formatted date and reading time", () => {
    render(<PostCard post={makePost()} />);
    expect(screen.getByText(/September 11, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/4 min read/)).toBeInTheDocument();
  });

  it("omits the date entirely when the post has none", () => {
    render(<PostCard post={makePost({ publishedAt: null })} />);
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
    expect(screen.getByText(/4 min read/)).toBeInTheDocument();
  });

  it("renders tags when present", () => {
    const post = makePost({
      postTags: [{ tag: { id: 7, name: "Next", kind: "topic", iconUrl: null } }],
    } as Partial<PublishedPost>);
    render(<PostCard post={post} />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});
