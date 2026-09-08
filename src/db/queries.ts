import { and, count, eq, asc, desc, sql } from "drizzle-orm";
import { db } from "./index";
import { projects } from "./schema";

const publishedOrder = [
  desc(projects.featured),
  sql`${projects.startedAt} desc nulls last`,
  desc(projects.sortOrder),
  asc(projects.id),
];

export async function getPublishedProjects() {
  return db.query.projects.findMany({
    where: eq(projects.status, "published"),
    orderBy: publishedOrder,
    with: {
      projectTags: { with: { tag: true } },
      metrics: { orderBy: (metrics, { asc }) => [asc(metrics.sortOrder)] },
    },
  });
}

export async function getPublishedProjectsPage(page: number, perPage: number) {
  const where = eq(projects.status, "published");

  const [rows, [totals]] = await Promise.all([
    db.query.projects.findMany({
      where,
      orderBy: publishedOrder,
      limit: perPage,
      offset: (page - 1) * perPage,
      with: {
        projectTags: { with: { tag: true } },
        metrics: { orderBy: (metrics, { asc }) => [asc(metrics.sortOrder)] },
      },
    }),
    db.select({ value: count() }).from(projects).where(where),
  ]);

  const total = totals?.value ?? 0;

  return {
    projects: rows,
    total,
    // At least 1, so an empty database renders "page 1 of 1" rather than 404ing
    // on its own only valid page.
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getFeaturedProjects(limit = 3) {
  return db.query.projects.findMany({
    where: and(eq(projects.status, "published"), eq(projects.featured, true)),
    orderBy: [
      sql`${projects.startedAt} desc nulls last`,
      desc(projects.sortOrder),
      asc(projects.id),
    ],
    limit,
    with: {
      projectTags: { with: { tag: true } },
      metrics: { orderBy: (metrics, { asc }) => [asc(metrics.sortOrder)] },
    },
  });
}

export type PublishedProject = Awaited<
  ReturnType<typeof getPublishedProjects>
>[number];

export async function getProjectBySlug(slug: string) {
  return db.query.projects.findFirst({
    where: eq(projects.slug, slug),
    with: {
      projectTags: { with: { tag: true } },
      metrics: { orderBy: (metrics, { asc }) => [asc(metrics.sortOrder)] },
    },
  });
}
