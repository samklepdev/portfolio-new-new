import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), del: vi.fn() }));
vi.mock("@/services/ProjectService", () => ({
  default: class { list = mocks.list; delete = mocks.del; },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ProjectsListPage from "./page";

describe("ProjectsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([
      { id: 1, slug: "alpha", title: "Alpha", status: "published", featured: true, startedAt: "2024-01-01" },
      { id: 2, slug: "beta", title: "Beta", status: "draft", featured: false, startedAt: null },
    ]);
  });

  it("renders a row per project with an edit link", async () => {
    render(<ProjectsListPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit alpha/i })).toHaveAttribute(
      "href", "/admin/projects/1/edit",
    );
  });

  it("deletes after confirm and refreshes the list", async () => {
    mocks.del.mockResolvedValue(undefined);
    render(<ProjectsListPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    const delButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(delButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(mocks.del).toHaveBeenCalledWith("1"));
  });
});
