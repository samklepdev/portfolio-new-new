import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";

const mocks = vi.hoisted(() => ({ get: vi.fn(), edit: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/PostService", () => ({
  default: class { get = mocks.get; edit = mocks.edit; },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import EditPostPage from "./page";

const dto = {
  id: 5, slug: "hello", title: "Hello", excerpt: "e", status: "published", featured: false,
  publishedAt: null, coverImage: null, content: null, readingMinutes: 2, tags: ["Next"],
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

// EditPostPage unwraps `params` with React's `use()`, which suspends on first
// render, so the render must happen inside an awaited `act` under a Suspense boundary.
async function renderPage() {
  await act(async () => {
    render(
      <Suspense>
        <EditPostPage params={Promise.resolve({ id: "5" })} />
      </Suspense>,
    );
  });
}

describe("EditPostPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prefills and saves through the service", async () => {
    mocks.get.mockResolvedValue(dto);
    mocks.edit.mockResolvedValue(dto);
    await renderPage();
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Hello"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.edit).toHaveBeenCalledWith("5", expect.objectContaining({ slug: "hello", tags: ["Next"] })));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/admin/posts"));
  });

  it("does not navigate when the save fails", async () => {
    mocks.get.mockResolvedValue(dto);
    mocks.edit.mockRejectedValue(new ApiError(400, "bad"));
    await renderPage();
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Hello"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
