import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminNav from "./AdminNav";

describe("AdminNav", () => {
  it("renders the implemented admin links and a sign-out control", () => {
    mocks.usePathname.mockReturnValue("/admin");
    render(<AdminNav />);
    for (const label of ["Dashboard", "Projects", "Posts"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("omits links to pages that do not exist yet", () => {
    mocks.usePathname.mockReturnValue("/admin");
    render(<AdminNav />);
    expect(screen.queryByRole("link", { name: "Tags" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Submissions" })).not.toBeInTheDocument();
  });

  it("marks the link matching the current path as current", () => {
    mocks.usePathname.mockReturnValue("/admin/projects");
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("treats /admin as current only on the exact dashboard path", () => {
    mocks.usePathname.mockReturnValue("/admin/posts");
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
});
