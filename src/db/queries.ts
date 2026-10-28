import { and, count, eq, asc, desc, inArray, isNotNull, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "./index";
import { posts, postTags, projects, tags, themes } from "./schema";

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

/**
 * Distinct industries published projects were built for, alphabetical.
 * The industry is stored in `projects.category`.
 */
export async function getPublishedProjectIndustries(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: projects.category })
    .from(projects)
    .where(and(eq(projects.status, "published"), isNotNull(projects.category)))
    .orderBy(asc(projects.category));
  return rows.map((row) => row.category).filter((c): c is string => c !== null);
}

export async function getPublishedProjectsPage(
  page: number,
  perPage: number,
  industry?: string
) {
  const where = industry
    ? and(eq(projects.status, "published"), eq(projects.category, industry))
    : eq(projects.status, "published");

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

// Postgres sorts NULLs FIRST on DESC, so an undated post would otherwise lead
// the blog. `nulls last` pushes it to the end; `id asc` is the stable tiebreak
// for posts sharing a date.
const postOrder = [
  sql`${posts.publishedAt} desc nulls last`,
  asc(posts.id),
];

const withPostTags = { postTags: { with: { tag: true } } } as const;

/** Post ids carrying a tag with this exact name. */
function postIdsWithTag(tagName: string) {
  return db
    .select({ id: postTags.postId })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(tags.name, tagName));
}

export async function getPublishedPosts() {
  return db.query.posts.findMany({
    where: eq(posts.status, "published"),
    orderBy: postOrder,
    with: withPostTags,
  });
}

export type PublishedPost = Awaited<ReturnType<typeof getPublishedPosts>>[number];

export async function getPublishedPostsPage(
  page: number,
  perPage: number,
  tagName?: string
) {
  const where = tagName
    ? and(eq(posts.status, "published"), inArray(posts.id, postIdsWithTag(tagName)))
    : eq(posts.status, "published");

  const [rows, [totals]] = await Promise.all([
    db.query.posts.findMany({
      where,
      orderBy: postOrder,
      limit: perPage,
      offset: (page - 1) * perPage,
      with: withPostTags,
    }),
    db.select({ value: count() }).from(posts).where(where),
  ]);

  const total = totals?.value ?? 0;

  return {
    posts: rows,
    total,
    // At least 1, so an empty blog renders "page 1 of 1" rather than 404ing on
    // its own only valid page.
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getFeaturedPosts(limit = 3) {
  return db.query.posts.findMany({
    where: and(eq(posts.status, "published"), eq(posts.featured, true)),
    orderBy: postOrder,
    limit,
    with: withPostTags,
  });
}

export async function getPostBySlug(slug: string) {
  return db.query.posts.findFirst({
    where: eq(posts.slug, slug),
    with: withPostTags,
  });
}

export async function getPublishedPostsCount(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.status, "published"));
  return row?.value ?? 0;
}

/** Distinct tag names used by published posts, alphabetical. */
export async function getPostTagNames(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(eq(posts.status, "published"))
    .orderBy(asc(tags.name));
  return rows.map((row) => row.name);
}

type ThemeRow = typeof themes.$inferSelect;

// Cached + tagged so the static root layout can read the active theme without
// forcing every page dynamic. Mutations call revalidateTag("active-theme").
export const getActiveTheme = unstable_cache(
  async (): Promise<ThemeRow | null> => {
    const [row] = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);
    return row ?? null;
  },
  ["active-theme"],
  { tags: ["active-theme"] },
);

// Public themes for the front-end switcher. Shares the "active-theme" cache tag
// so every theme mutation (which already revalidates it) busts this too.
export const getPublicThemes = unstable_cache(
  async (): Promise<ThemeRow[]> =>
    db
      .select()
      .from(themes)
      .where(eq(themes.isPublic, true))
      .orderBy(desc(themes.isActive), asc(themes.id)),
  ["public-themes"],
  { tags: ["active-theme"] },
);
