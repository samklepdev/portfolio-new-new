import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeleteButton from "./DeleteButton";

describe("DeleteButton", () => {
  it("requires a confirm click before calling onConfirm", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeleteButton onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("shows a custom confirm label when armed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeleteButton onConfirm={onConfirm} confirmLabel="Unlinks from 2 projects — confirm?" />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    const armed = screen.getByRole("button", { name: /unlinks from 2 projects/i });
    fireEvent.click(armed);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});
