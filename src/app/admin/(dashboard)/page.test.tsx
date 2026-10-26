import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardStats } from "@/db/admin-dashboard";

const mocks = vi.hoisted(() => ({ getDashboardStats: vi.fn() }));
vi.mock("@/db/admin-dashboard", () => ({ getDashboardStats: mocks.getDashboardStats }));
vi.mock("@/services/ProjectService", () => ({ default: class { list = vi.fn().mockResolvedValue([]); } }));
vi.mock("@/services/PostService", () => ({ default: class { list = vi.fn().mockResolvedValue([]); } }));
vi.mock("@/services/TagService", () => ({ default: class { list = vi.fn().mockResolvedValue([]); } }));
vi.mock("@/services/SubmissionService", () => ({ default: class { list = vi.fn().mockResolvedValue([]); } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AdminDashboard from "./page";

const stats: DashboardStats = {
  projects: { total: 15, published: 13, draft: 2 },
  posts: { total: 3, published: 3, draft: 0 },
  submissionsLast30Days: 4,
  recentSubmissions: [
    { id: 2, name: "Ada Lovelace", email: "ada@example.com", createdAt: new Date("2026-10-20T12:00:00Z") },
  ],
  email: { delivered: 5, failed: 0, pending: 1 },
  tags: { tech: 20, topic: 6 },
};

describe("AdminDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders overview metrics, recent inquiries, and management links", async () => {
    mocks.getDashboardStats.mockResolvedValue(stats);
    render(await AdminDashboard());

    const metrics = within(screen.getByRole("region", { name: "Site metrics" }));
    expect(metrics.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();          // projects total
    expect(screen.getByText(/2 drafts?/i)).toBeInTheDocument();  // draft count
    expect(metrics.getByText("Posts")).toBeInTheDocument();
    expect(screen.getByText("New inquiries")).toBeInTheDocument();

    expect(screen.getByText(/Recent inquiries/i)).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    expect(screen.getByText(/Email delivered/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Published content" })).toHaveAttribute(
      "aria-valuenow",
      "89",
    );
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/admin/submissions",
    );
    expect(screen.getByText(/Tech tags/i)).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();          // tech tags
    expect(
      screen.getByRole("combobox", { name: /search admin content/i }),
    ).toBeInTheDocument();
  });

  it("flags email delivery failures with an alert cue", async () => {
    mocks.getDashboardStats.mockResolvedValue({ ...stats, email: { delivered: 5, failed: 3, pending: 0 } });
    render(await AdminDashboard());
    const alert = screen.getByRole("status", { name: /email delivery/i });
    expect(alert).toHaveTextContent("3");
  });

  it("does not render an alert when there are no failures", async () => {
    mocks.getDashboardStats.mockResolvedValue(stats); // failed: 0
    render(await AdminDashboard());
    expect(screen.queryByRole("status", { name: /email delivery/i })).toBeNull();
  });
});
