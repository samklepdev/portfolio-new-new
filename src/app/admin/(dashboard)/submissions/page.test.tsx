import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/services/SubmissionService", () => ({ default: class { list = mocks.list; } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SubmissionsListPage from "./page";

describe("SubmissionsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([
      { id: 5, name: "Jane Doe", email: "jane@co.com", budget: null, website: null, message: "Hi",
        createdAt: "2026-02-01T00:00:00Z", emailedAt: "2026-02-01T00:05:00Z", emailError: null },
      { id: 6, name: "John Roe", email: "john@x.com", budget: null, website: null, message: "Hey",
        createdAt: "2026-01-08T00:00:00Z", emailedAt: null, emailError: "550 rejected" },
    ]);
  });

  it("renders a row per submission with a delivery badge and a view link", async () => {
    render(<SubmissionsListPage />);
    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());
    expect(screen.getByText("delivered")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view jane doe/i })).toHaveAttribute("href", "/admin/submissions/5");
  });
});
