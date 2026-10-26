import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";

const mocks = vi.hoisted(() => ({ get: vi.fn(), edit: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/ProjectService", () => ({
  default: class { get = mocks.get; edit = mocks.edit; },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import EditProjectPage from "./page";

const dto = {
  id: 1, slug: "alpha", title: "Alpha", summary: "s", status: "published", featured: false,
  category: null, role: null, dateLabel: null, sortOrder: 0, startedAt: null, completedAt: null,
  liveUrl: null, repoUrl: null, coverImage: null, content: null,
  techDescription: null, techTabImage: null, techTabImageAlt: null,
  designDescription: null, designTabImage: null, designTabImageAlt: null, tech: [],
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

// EditProjectPage unwraps `params` with React's `use()`, which suspends on first
// render, so the render must happen inside an awaited `act` under a Suspense boundary.
async function renderPage() {
  await act(async () => {
    render(
      <Suspense>
        <EditProjectPage params={Promise.resolve({ id: "1" })} />
      </Suspense>,
    );
  });
}

describe("EditProjectPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prefills the form and saves through the service", async () => {
    mocks.get.mockResolvedValue(dto);
    mocks.edit.mockResolvedValue(dto);
    await renderPage();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Alpha"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.edit).toHaveBeenCalledWith("1", expect.objectContaining({ slug: "alpha" })));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/admin/projects"));
  });

  it("does not navigate when the save fails", async () => {
    mocks.get.mockResolvedValue(dto);
    mocks.edit.mockRejectedValue(new ApiError(400, "Missing or empty \"title\""));
    await renderPage();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Alpha"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
