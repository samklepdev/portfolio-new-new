import { and, count, eq, asc, desc, sql } from "drizzle-orm";
import { db } from "./index";
import { projects } from "./schema";

const publishedOrder = [
  desc(projects.featured),
  sql`${projects.startedAt} desc nulls last`,
  desc(projects.sortOrder),
  asc(projects.id),
];

/**
 * Retrieves a list of published projects from the database.
 *
 * The projects are filtered by their status to include only those marked as "published".
 * The result is ordered according to a predefined published order.
 * Each project will include related data such as associated tags and metrics, which are sorted by their specified order.
 *
 * @return {Promise<Array>} A promise that resolves to an array of published projects, including their tags and metrics.
 */
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

/**
 * Retrieves a paginated list of published projects along with the total count and total pages.
 *
 * @param {number} page - The current page number to retrieve. Must be a positive integer.
 * @param {number} perPage - The number of projects to retrieve per page. Must be a positive integer.
 * @return {Promise<{projects: Array, total: number, totalPages: number}>}
 *         A promise resolving to an object containing:
 *         - `projects`: The list of published projects for the specified page.
 *         - `total`: The total number of published projects.
 *         - `totalPages`: The computed total number of pages available based on the `perPage` parameter.
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
 * Retrieves a list of featured projects that are published, sorted by their starting date, sort order,
 * and ID. Includes project tags and associated metrics in the result.
 *
 * @param {number} [limit=3] - The maximum number of projects to retrieve.
 * @return {Promise<Array<Object>>} A promise that resolves with an array of featured project objects, including tags and metrics.
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

export type PublishedProject = Awaited<
  ReturnType<typeof getPublishedProjects>
>[number];

/**
 * Retrieves a project by its unique slug.
 *
 * @param {string} slug - The unique identifier for the project to retrieve.
 * @return {Promise<Object|null>} A promise that resolves to the project object if found, or null if no project matches the given slug.
 */
export async function getProjectBySlug(slug: string) {
  return db.query.projects.findFirst({
    where: eq(projects.slug, slug),
    with: {
      projectTags: { with: { tag: true } },
      metrics: { orderBy: (metrics, { asc }) => [asc(metrics.sortOrder)] },
    },
  });
}
