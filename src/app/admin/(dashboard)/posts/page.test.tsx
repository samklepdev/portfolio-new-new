import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), del: vi.fn() }));
vi.mock("@/services/PostService", () => ({
  default: class { list = mocks.list; delete = mocks.del; },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PostsListPage from "./page";

describe("PostsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([
      { id: 5, slug: "hello", title: "Hello", status: "published", featured: false, publishedAt: "2026-02-01" },
    ]);
  });

  it("renders a row per post with an edit link", async () => {
    render(<PostsListPage />);
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /edit hello/i })).toHaveAttribute(
      "href", "/admin/posts/5/edit",
    );
  });

  it("deletes after confirm", async () => {
    mocks.del.mockResolvedValue(undefined);
    render(<PostsListPage />);
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(mocks.del).toHaveBeenCalledWith("5"));
  });
});
