import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";
import PostForm, { emptyPostInput } from "./PostForm";

describe("PostForm", () => {
  it("submits the assembled input including tags", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PostForm initial={emptyPostInput()} submitLabel="Create" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "hello" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText("Excerpt"), { target: { value: "Hi there" } });

    fireEvent.change(screen.getByLabelText(/add tag/i), { target: { value: "Next" } });
    fireEvent.click(screen.getByRole("button", { name: /add tag/i }));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "hello", title: "Hello", excerpt: "Hi there", status: "draft", tags: ["Next"] }),
      ),
    );
  });

  it("shows the server error on a 409", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, "A post with slug \"hello\" already exists"));
    render(<PostForm initial={{ ...emptyPostInput(), slug: "hello", title: "H", excerpt: "e" }}
      submitLabel="Create" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i));
  });
});
