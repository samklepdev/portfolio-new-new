import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ThemeForm from "./ThemeForm";

describe("ThemeForm", () => {
  it("renders a name field and all six colour fields", () => {
    render(<ThemeForm submitLabel="Create theme" onSubmit={vi.fn()} submitting={false} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    for (const slot of ["Background", "Foreground", "Turquoise", "Pink", "Purple", "Green"]) {
      expect(screen.getByLabelText(slot)).toBeInTheDocument();
    }
  });

  it("prefills from an existing theme", () => {
    render(
      <ThemeForm
        submitLabel="Save"
        submitting={false}
        onSubmit={vi.fn()}
        initial={{
          id: 3, name: "Sunset", isActive: false,
          background: "#101010", foreground: "#fafafa", turquoise: "#11ccdd",
          pink: "#ee3388", purple: "#9922ee", green: "#22dd77",
        }}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("Sunset");
  });

  it("submits the entered values", () => {
    const onSubmit = vi.fn();
    render(<ThemeForm submitLabel="Create theme" onSubmit={onSubmit} submitting={false} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Vapor" } });
    fireEvent.submit(screen.getByRole("button", { name: /create theme/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Vapor", background: expect.any(String) }),
    );
  });
});
