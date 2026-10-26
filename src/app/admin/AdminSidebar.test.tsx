import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminSidebar from "./AdminSidebar";

describe("AdminSidebar", () => {
  it("renders all six admin links and a sign-out control", () => {
    mocks.usePathname.mockReturnValue("/admin");
    render(<AdminSidebar collapsed={false} onToggleCollapsed={vi.fn()} />);
    for (const label of ["Dashboard", "Projects", "Posts", "Tags", "Themes", "Submissions"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("marks the link matching the current path as current", () => {
    mocks.usePathname.mockReturnValue("/admin/projects");
    render(<AdminSidebar collapsed={false} onToggleCollapsed={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("treats /admin as current only on the exact dashboard path", () => {
    mocks.usePathname.mockReturnValue("/admin/posts");
    render(<AdminSidebar collapsed={false} onToggleCollapsed={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("keeps links queryable by name when collapsed", () => {
    mocks.usePathname.mockReturnValue("/admin");
    render(<AdminSidebar collapsed={true} onToggleCollapsed={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
  });

  it("exposes the collapse toggle state via aria-expanded and fires the callback", () => {
    mocks.usePathname.mockReturnValue("/admin");
    const onToggle = vi.fn();
    render(<AdminSidebar collapsed={false} onToggleCollapsed={onToggle} />);
    const toggle = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
