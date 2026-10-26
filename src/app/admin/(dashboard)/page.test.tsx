import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardStats } from "@/db/admin-dashboard";

const mocks = vi.hoisted(() => ({ getDashboardStats: vi.fn() }));
vi.mock("@/db/admin-dashboard", () => ({ getDashboardStats: mocks.getDashboardStats }));

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

  it("renders the four stat cards with their numbers", async () => {
    mocks.getDashboardStats.mockResolvedValue(stats);
    render(await AdminDashboard());

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();          // projects total
    expect(screen.getByText(/2 drafts?/i)).toBeInTheDocument();  // draft count

    expect(screen.getByText(/Recent submissions/i)).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    expect(screen.getByText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText("Tag distribution")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();          // tech tags
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
