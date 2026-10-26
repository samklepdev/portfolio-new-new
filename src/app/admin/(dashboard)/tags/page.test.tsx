import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), edit: vi.fn(), del: vi.fn() }));
vi.mock("@/services/TagService", () => ({
  default: class { list = mocks.list; save = mocks.save; edit = mocks.edit; delete = mocks.del; },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import TagsListPage from "./page";

const tags = [
  { id: 1, name: "React", kind: "tech", iconUrl: null, projectCount: 2, postCount: 0 },
  { id: 2, name: "Self-hosting", kind: "topic", iconUrl: null, projectCount: 0, postCount: 0 },
];

describe("TagsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue(tags);
  });

  it("renders a row per tag with its usage", async () => {
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    expect(screen.getByText("2 projects")).toBeInTheDocument();
  });

  it("creates a tag and refetches", async () => {
    mocks.save.mockResolvedValue({ id: 3, name: "Vue", kind: "tech", iconUrl: null });
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("New tag name"), { target: { value: "Vue" } });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Vue", kind: "tech", iconUrl: null }),
    ));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  });

  it("edits a tag through the service", async () => {
    mocks.edit.mockResolvedValue(tags[0]);
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /edit react/i }));
    fireEvent.change(screen.getByLabelText(/edit name/i), { target: { value: "Preact" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.edit).toHaveBeenCalledWith("1", expect.objectContaining({ name: "Preact" })));
  });

  it("does not save an edit with an empty name", async () => {
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /edit react/i }));
    fireEvent.change(screen.getByLabelText(/edit name/i), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.edit).not.toHaveBeenCalled());
  });

  it("names the cascade impact when deleting a used tag", async () => {
    mocks.del.mockResolvedValue(undefined);
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    const delButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(delButtons[0]); // React row (2 projects)
    fireEvent.click(screen.getByRole("button", { name: /unlinks from 2 projects/i }));
    await waitFor(() => expect(mocks.del).toHaveBeenCalledWith("1"));
  });
});
