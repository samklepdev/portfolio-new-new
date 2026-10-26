import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import AdminLoginPage from "./page";

describe("AdminLoginPage", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
    vi.stubGlobal("fetch", vi.fn());
    window.history.replaceState({}, "", "/admin/login");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("navigates to /admin on a successful login", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({ ok: true });
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an error and does not navigate on a failed login", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Incorrect password" }),
    });
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Incorrect password")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("honors a safe /admin sub-path from ?from", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({ ok: true });
    window.history.replaceState({}, "", "/admin/login?from=/admin/projects");
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/projects"));
  });

  it("ignores an absolute external ?from (open-redirect guard)", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({ ok: true });
    window.history.replaceState({}, "", "/admin/login?from=https://evil.com");
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
  });

  it("ignores a protocol-relative ?from and a non-admin path", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({ ok: true });
    window.history.replaceState({}, "", "/admin/login?from=//evil.com");
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
  });

  it("does not loop back to /admin/login from ?from", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({ ok: true });
    window.history.replaceState({}, "", "/admin/login?from=/admin/login");
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
  });
});
