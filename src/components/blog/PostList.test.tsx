import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostList } from "./PostList";
import type { PublishedPost } from "@/db/queries";

function makePost(slug: string, title: string): PublishedPost {
  return {
    id: slug.length,
    slug,
    title,
    excerpt: `${title} summary.`,
    status: "published",
    featured: false,
    publishedAt: "2026-09-11",
    coverImage: null,
    readingMinutes: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    postTags: [],
  } as PublishedPost;
}

describe("PostList", () => {
  it("renders one linked row per post", () => {
    render(<PostList posts={[makePost("a", "First"), makePost("b", "Second")]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /First/ })).toHaveAttribute("href", "/blog/a");
    expect(screen.getByRole("link", { name: /Second/ })).toHaveAttribute("href", "/blog/b");
  });

  it("shows the empty state when there are no posts", () => {
    render(<PostList posts={[]} />);
    expect(screen.getByText("No posts yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows date and reading time per row", () => {
    render(<PostList posts={[makePost("a", "First")]} />);
    expect(screen.getByText(/September 11, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/3 min read/)).toBeInTheDocument();
  });
});
