import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminShell from "./AdminShell";

describe("AdminShell", () => {
  beforeEach(() => {
    mocks.usePathname.mockReturnValue("/admin");
    localStorage.clear();
  });

  it("renders its children", () => {
    render(<AdminShell><p>hello admin</p></AdminShell>);
    expect(screen.getByText("hello admin")).toBeInTheDocument();
  });

  it("toggles the mobile drawer open state via the menu button", () => {
    render(<AdminShell><p>content</p></AdminShell>);
    const menu = screen.getByRole("button", { name: /open menu/i });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(menu);
    expect(screen.getByRole("button", { name: /close menu/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("closes an open drawer on Escape", () => {
    render(<AdminShell><p>content</p></AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("starts collapsed when localStorage says so", () => {
    localStorage.setItem("admin-sidebar-collapsed", "true");
    render(<AdminShell><p>content</p></AdminShell>);
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("persists the collapsed state when toggled", () => {
    render(<AdminShell><p>content</p></AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(localStorage.getItem("admin-sidebar-collapsed")).toBe("true");
  });

  it("closes the drawer when the route changes", () => {
    const { rerender } = render(<AdminShell><p>content</p></AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();
    mocks.usePathname.mockReturnValue("/admin/posts");
    rerender(<AdminShell><p>content</p></AdminShell>);
    expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute("aria-expanded", "false");
  });
});
