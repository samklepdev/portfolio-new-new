import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedProject } from "@/db/queries";

const mocks = vi.hoisted(() => ({
  getProjectBySlug: vi.fn(),
  getPublishedProjects: vi.fn(),
  resolvePublicImage: vi.fn(),
}));

vi.mock("@/db/queries", () => ({
  getProjectBySlug: mocks.getProjectBySlug,
  getPublishedProjects: mocks.getPublishedProjects,
}));

vi.mock("@/lib/content", () => ({
  resolvePublicImage: mocks.resolvePublicImage,
}));

vi.mock("next-mdx-remote/rsc", () => ({
  MDXRemote: ({ source }: { source: string }) => <div data-testid="mdx">{source}</div>,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import ProjectPage, { generateStaticParams } from "./page";

const project = {
  id: 1,
  slug: "build-on",
  title: "Build-On",
  summary: "A summary.",
  status: "published",
  featured: true,
  role: "Lead",
  category: "Web",
  dateLabel: "2025",
  sortOrder: 3,
  startedAt: null,
  completedAt: null,
  repoUrl: null,
  liveUrl: null,
  coverImage: null,
  content: "Case study body.",
  techDescription: "How it was built.",
  techTabImage: null,
  techTabImageAlt: null,
  designDescription: "How it looks.",
  designTabImage: null,
  designTabImageAlt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  projectTags: [{ tag: { id: 3, name: "Next", kind: "tech", iconUrl: null } }],
  metrics: [],
} as unknown as PublishedProject;

const renderPage = async (slug: string) =>
  render(await ProjectPage({ params: Promise.resolve({ slug }) }));

describe("ProjectPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePublicImage.mockResolvedValue(null);
  });

  it("renders the body from the DB content column", async () => {
    mocks.getProjectBySlug.mockResolvedValue(project);
    await renderPage("build-on");
    expect(screen.getByRole("heading", { level: 1, name: "Build-On" })).toBeInTheDocument();
    expect(screen.getAllByTestId("mdx")[0]).toHaveTextContent("Case study body.");
  });

  it("builds tabs from the row's tab columns", async () => {
    mocks.getProjectBySlug.mockResolvedValue(project);
    await renderPage("build-on");
    expect(screen.getByText("How it was built.")).toBeInTheDocument();
    expect(screen.getByText("How it looks.")).toBeInTheDocument();
  });

  it("404s when content is empty", async () => {
    mocks.getProjectBySlug.mockResolvedValue({ ...project, content: null });
    await expect(renderPage("build-on")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s on a draft", async () => {
    mocks.getProjectBySlug.mockResolvedValue({ ...project, status: "draft" });
    await expect(renderPage("build-on")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("generateStaticParams", () => {
  it("prerenders only published slugs that have content", async () => {
    mocks.getPublishedProjects.mockResolvedValue([
      { ...project, slug: "has-content" },
      { ...project, slug: "no-content", content: null },
    ]);
    expect(await generateStaticParams()).toEqual([{ slug: "has-content" }]);
  });
});
