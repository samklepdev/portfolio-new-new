import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";
import ProjectForm, { emptyProjectInput } from "./ProjectForm";

describe("ProjectForm", () => {
  it("submits the assembled input", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProjectForm initial={emptyProjectInput()} submitLabel="Create" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "demo" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Demo" } });
    fireEvent.change(screen.getByLabelText("Summary"), { target: { value: "A demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "demo", title: "Demo", summary: "A demo", status: "draft" }),
      ),
    );
  });

  it("shows the server error and keeps the form on a 409", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, "A project with slug \"demo\" already exists"));
    render(<ProjectForm initial={{ ...emptyProjectInput(), slug: "demo", title: "D", summary: "s" }}
      submitLabel="Create" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i));
  });

  it("converts empty optional fields to null on submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProjectForm initial={{ ...emptyProjectInput(), slug: "demo", title: "D", summary: "s" }}
      submitLabel="Create" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category: null, liveUrl: null, startedAt: null })),
    );
  });
});
