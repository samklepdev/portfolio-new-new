import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listPosts: vi.fn(),
  listTags: vi.fn(),
  listSubmissions: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/services/ProjectService", () => ({ default: class { list = mocks.listProjects; } }));
vi.mock("@/services/PostService", () => ({ default: class { list = mocks.listPosts; } }));
vi.mock("@/services/TagService", () => ({ default: class { list = mocks.listTags; } }));
vi.mock("@/services/SubmissionService", () => ({ default: class { list = mocks.listSubmissions; } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import GlobalSearch from "./GlobalSearch";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listProjects.mockResolvedValue([
    { id: 1, slug: "alpha", title: "Alpha Portal", status: "published" },
  ]);
  mocks.listPosts.mockResolvedValue([
    { id: 5, slug: "hello", title: "Alpha Notes", status: "published" },
  ]);
  mocks.listTags.mockResolvedValue([
    { id: 9, name: "React", kind: "tech", iconUrl: null, projectCount: 1, postCount: 0 },
  ]);
  mocks.listSubmissions.mockResolvedValue([
    { id: 7, name: "Ada Lovelace", email: "ada@alpha.com", budget: null, website: null,
      message: "Hi", createdAt: "2026-02-01T00:00:00Z", emailedAt: null, emailError: null },
  ]);
});

describe("GlobalSearch", () => {
  it("renders a combobox search input", async () => {
    render(<GlobalSearch />);
    expect(screen.getByRole("combobox", { name: /search admin content/i })).toBeInTheDocument();
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());
  });

  it("shows grouped, matching results with correct hrefs as you type", async () => {
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());

    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "alpha" },
    });

    const listbox = await screen.findByRole("listbox");
    // Matches: Alpha Portal (project), Alpha Notes (post), ada@alpha.com (submission).
    expect(within(listbox).getByRole("option", { name: /Alpha Portal/ })).toHaveAttribute(
      "href", "/admin/projects/1/edit",
    );
    expect(within(listbox).getByRole("option", { name: /Alpha Notes/ })).toHaveAttribute(
      "href", "/admin/posts/5/edit",
    );
    expect(within(listbox).getByRole("option", { name: /Ada Lovelace/ })).toHaveAttribute(
      "href", "/admin/submissions/7",
    );
    // React tag does not match "alpha".
    expect(within(listbox).queryByRole("option", { name: /React/ })).toBeNull();
  });

  it("shows an empty state when nothing matches", async () => {
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "zzzzz" },
    });
    expect(await screen.findByText(/no matches/i)).toBeInTheDocument();
  });

  it("navigates to the highlighted result on Enter and closes on Escape", async () => {
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());
    const input = screen.getByRole("combobox", { name: /search admin content/i });

    fireEvent.change(input, { target: { value: "alpha" } });
    await screen.findByRole("listbox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.push).toHaveBeenCalledWith("/admin/projects/1/edit");

    fireEvent.change(input, { target: { value: "alpha" } });
    await screen.findByRole("listbox");
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("still renders results from other services when one list fails", async () => {
    mocks.listProjects.mockRejectedValue(new Error("boom"));
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listPosts).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "alpha" },
    });
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Alpha Notes/ })).toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: /Alpha Portal/ })).toBeNull();
  });
});
