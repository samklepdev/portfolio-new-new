import { and, eq, asc, desc, sql } from "drizzle-orm";
import { db } from "./index";
import { projects } from "./schema";

/**
 * All published projects for the grid, with tags and metrics nested —
 * one round trip instead of N+1 queries per card.
 */
export async function getPublishedProjects() {
  return db.query.projects.findMany({
    where: eq(projects.status, "published"),
    // Postgres sorts NULLs first on DESC, which would float undated projects to
    // the top of the grid — `nulls last` keeps them at the bottom. The asc(id)
    // tiebreak makes ordering stable and, while startedAt is unset across the
    // board, falls back to seed order so the first project listed in seed.ts is
    // the one that leads the grid.
    orderBy: [
      desc(projects.featured),
      sql`${projects.startedAt} desc nulls last`,
      asc(projects.id),
    ],
    with: {
      projectTags: { with: { tag: true } },
      metrics: { orderBy: (metrics, { asc }) => [asc(metrics.sortOrder)] },
    },
  });
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
    orderBy: [sql`${projects.startedAt} desc nulls last`, asc(projects.id)],
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
