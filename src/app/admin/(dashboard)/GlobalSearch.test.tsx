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

    // Wait for an actual option (not just the listbox, which is now always
    // present once the dropdown is open — see the M3 a11y fix) so the
    // debounce + data load have both settled before asserting.
    await screen.findByRole("option", { name: /Alpha Portal/ });
    const listbox = screen.getByRole("listbox");
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
    // Wait for an actual option, not just the listbox (always present once
    // open per the M3 fix), so the debounce + data load have settled.
    await screen.findByRole("option", { name: /Alpha Portal/ });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.push).toHaveBeenCalledWith("/admin/projects/1/edit");

    fireEvent.change(input, { target: { value: "alpha" } });
    await screen.findByRole("option", { name: /Alpha Portal/ });
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
    // Wait for an actual option, not just the listbox (always present once
    // open per the M3 fix), so the debounce + data load have settled.
    await screen.findByRole("option", { name: /Alpha Notes/ });
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Alpha Notes/ })).toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: /Alpha Portal/ })).toBeNull();
  });

  it("keeps a listbox element in the DOM for the empty state", async () => {
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "zzzzz" },
    });
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText(/no matches/i)).toBeInTheDocument();
  });

  it("conveys the result type via a group role/label on each result group", async () => {
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "alpha" },
    });
    await screen.findByRole("option", { name: /Alpha Portal/ });

    const projectGroup = screen.getByRole("group", { name: "Projects" });
    expect(within(projectGroup).getByRole("option", { name: /Alpha Portal/ })).toBeInTheDocument();
  });

  it("caps each group at 5 and shows a +N more link to the section list page", async () => {
    mocks.listProjects.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        slug: `alpha-${i + 1}`,
        title: `Alpha Portal ${i + 1}`,
        status: "published",
      })),
    );
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());

    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "alpha portal" },
    });

    await screen.findByRole("option", { name: /Alpha Portal 1/ });
    const listbox = screen.getByRole("listbox");
    const projectGroup = within(listbox).getByRole("group", { name: "Projects" });
    expect(within(projectGroup).getAllByRole("option")).toHaveLength(5);

    const moreLink = within(projectGroup).getByRole("link", { name: /\+2 more/i });
    expect(moreLink).toHaveAttribute("href", "/admin/projects");
  });
});
