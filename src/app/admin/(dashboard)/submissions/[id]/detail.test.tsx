import { render, screen, waitFor, act } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/SubmissionService", () => ({ default: class { get = mocks.get; } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SubmissionDetailPage from "./page";

const dto = {
  id: 5, name: "Jane Doe", email: "jane@co.com", budget: "$10k–20k", website: "co.com",
  message: "Hi, I'd love to talk.", createdAt: "2026-02-01T00:00:00Z",
  emailedAt: "2026-02-01T00:05:00Z", emailError: null,
};

// Detail unwraps `params` with use(); render inside an awaited act under Suspense.
async function renderPage() {
  await act(async () => {
    render(
      <Suspense>
        <SubmissionDetailPage params={Promise.resolve({ id: "5" })} />
      </Suspense>,
    );
  });
}

describe("SubmissionDetailPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the submission with a mailto reply link and the message", async () => {
    mocks.get.mockResolvedValue(dto);
    await renderPage();
    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "jane@co.com" })).toHaveAttribute("href", "mailto:jane@co.com");
    expect(screen.getByText("Hi, I'd love to talk.")).toBeInTheDocument();
    expect(screen.getByText("$10k–20k")).toBeInTheDocument();
  });

  it("shows a not-found state instead of loading forever when the fetch fails", async () => {
    mocks.get.mockRejectedValue(new ApiError(404, "Not found"));
    await renderPage();
    await waitFor(() => expect(screen.getByText("Not found")).toBeInTheDocument());
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /all submissions/i })).toBeInTheDocument();
  });
});
