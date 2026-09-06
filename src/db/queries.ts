import { and, count, eq, asc, desc, sql } from "drizzle-orm";
import { db } from "./index";
import { projects } from "./schema";

/** Shared ordering, so a paginated slice matches the unpaginated list exactly. */
const publishedOrder = [
  desc(projects.featured),
  sql`${projects.startedAt} desc nulls last`,
  desc(projects.sortOrder),
  asc(projects.id),
];

/**
 * All published projects for the grid, with tags and metrics nested —
 * one round trip instead of N+1 queries per card.
 */
export async function getPublishedProjects() {
  return db.query.projects.findMany({
    where: eq(projects.status, "published"),
    // sortOrder mirrors the `id` in the content frontmatter — the ordering the
    // old site used, highest first. startedAt is still consulted ahead of it for
    // any project that gains a real date, with `nulls last` so undated projects
    // do not float to the top (Postgres sorts NULLs first on DESC).
    orderBy: publishedOrder,
    with: {
      projectTags: { with: { tag: true } },
      metrics: { orderBy: (metrics, { asc }) => [asc(metrics.sortOrder)] },
    },
  });
}

/**
 * One page of published projects, plus the total needed to render the pager.
 *
 * Paged in SQL rather than by slicing the full list in the component, so the
 * page never fetches — or nests tags and metrics onto — rows it will not
 * render. The count is a second round trip; a window function would fold it
 * into one query but is not expressible through the relational query builder.
 */
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

/**
 * The featured projects only, for the home page. The full list — featured
 * included — lives at /projects and comes from getPublishedProjects().
 *
 * Filtered and limited in SQL rather than by slicing in the component, so the
 * home page never fetches rows it will not render.
 */
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

/**
 * A project row with its tags and metrics nested, as returned by
 * getPublishedProjects(). Inferred rather than hand-written so it cannot drift
 * from the schema or the `with` clause above.
 */
export type PublishedProject = Awaited<
  ReturnType<typeof getPublishedProjects>
>[number];

/** Single project by slug, for the /projects/[slug] detail page. */
export async function getProjectBySlug(slug: string) {
  return db.query.projects.findFirst({
    where: eq(projects.slug, slug),
    with: {
      projectTags: { with: { tag: true } },
      metrics: { orderBy: (metrics, { asc }) => [asc(metrics.sortOrder)] },
    },
  });
}
