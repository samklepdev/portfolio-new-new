import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// AdminNav is a client component using next/navigation; mock it so rendering
// a layout that (incorrectly) pulls it in doesn't throw, and the assertion
// about the nav's *presence* is what's exercised.
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/login",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminLayout from "./layout";

describe("AdminLayout (top-level — wraps /admin/login too)", () => {
  it("does not render the admin nav or sign-out control", () => {
    render(AdminLayout({ children: <div>child</div> }));
    // The login screen must not carry the authenticated chrome.
    expect(screen.queryByRole("navigation", { name: "Admin" })).toBeNull();
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
