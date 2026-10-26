import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "./index";
import { posts, postTags, projects, projectTags, tags } from "./schema";
import type { ProjectInput, PostInput, TagInput } from "@/services/types";

export type ProjectRow = typeof projects.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type TagRow = typeof tags.$inferSelect;

export type ProjectWrite = ProjectInput & { id?: number };
export type PostWrite = PostInput & { id?: number };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Upsert tech/topic tags by name, returning a name->id map. Mirrors the
// importer: tech tags set kind + icon on conflict; topic tags no-op on
// conflict so a name shared with a tech tag keeps its existing kind.
async function upsertTechTags(tx: Tx, tech: ProjectInput["tech"]): Promise<Map<string, number>> {
  const byName = new Map<string, string | null>();
  for (const { name, iconUrl } of tech) if (!byName.has(name)) byName.set(name, iconUrl);
  if (byName.size === 0) return new Map();
  const rows = await tx
    .insert(tags)
    .values([...byName].map(([name, iconUrl]) => ({ name, kind: "tech", iconUrl })))
    .onConflictDoUpdate({
      target: tags.name,
      set: { kind: sql`excluded.kind`, iconUrl: sql`excluded.icon_url` },
    })
    .returning();
  return new Map(rows.map((r) => [r.name, r.id]));
}

async function upsertTopicTags(tx: Tx, names: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(names)];
  if (unique.length === 0) return new Map();
  const rows = await tx
    .insert(tags)
    .values(unique.map((name) => ({ name, kind: "topic", iconUrl: null })))
    .onConflictDoUpdate({ target: tags.name, set: { name: sql`excluded.name` } })
    .returning();
  return new Map(rows.map((r) => [r.name, r.id]));
}

// A tag is orphaned only when NEITHER projects NOR posts reference it.
async function pruneOrphanTags(tx: Tx): Promise<void> {
  await tx
    .delete(tags)
    .where(
      and(
        notInArray(tags.id, tx.select({ id: projectTags.tagId }).from(projectTags)),
        notInArray(tags.id, tx.select({ id: postTags.tagId }).from(postTags)),
      ),
    );
}

const PROJECT_COLUMNS = (p: ProjectWrite) => ({
  slug: p.slug,
  title: p.title,
  summary: p.summary,
  status: p.status,
  featured: p.featured,
  category: p.category,
  role: p.role,
  dateLabel: p.dateLabel,
  sortOrder: p.sortOrder,
  startedAt: p.startedAt,
  completedAt: p.completedAt,
  liveUrl: p.liveUrl,
  repoUrl: p.repoUrl,
  coverImage: p.coverImage,
  content: p.content,
  techDescription: p.techDescription,
  techTabImage: p.techTabImage,
  techTabImageAlt: p.techTabImageAlt,
  designDescription: p.designDescription,
  designTabImage: p.designTabImage,
  designTabImageAlt: p.designTabImageAlt,
});

export async function upsertProjectWithTags(input: ProjectWrite): Promise<ProjectRow> {
  return db.transaction(async (tx) => {
    const cols = PROJECT_COLUMNS(input);
    let row: ProjectRow;
    if (input.id !== undefined) {
      const [updated] = await tx
        .update(projects)
        .set({ ...cols, updatedAt: new Date() })
        .where(eq(projects.id, input.id))
        .returning();
      if (!updated) throw new Error(`Project ${input.id} not found`);
      row = updated;
    } else {
      const [inserted] = await tx
        .insert(projects)
        .values(cols)
        .onConflictDoUpdate({
          target: projects.slug,
          set: {
            title: sql`excluded.title`,
            summary: sql`excluded.summary`,
            status: sql`excluded.status`,
            featured: sql`excluded.featured`,
            category: sql`excluded.category`,
            role: sql`excluded.role`,
            dateLabel: sql`excluded.date_label`,
            sortOrder: sql`excluded.sort_order`,
            startedAt: sql`excluded.started_at`,
            completedAt: sql`excluded.completed_at`,
            liveUrl: sql`excluded.live_url`,
            repoUrl: sql`excluded.repo_url`,
            coverImage: sql`excluded.cover_image`,
            content: sql`excluded.content`,
            techDescription: sql`excluded.tech_description`,
            techTabImage: sql`excluded.tech_tab_image`,
            techTabImageAlt: sql`excluded.tech_tab_image_alt`,
            designDescription: sql`excluded.design_description`,
            designTabImage: sql`excluded.design_tab_image`,
            designTabImageAlt: sql`excluded.design_tab_image_alt`,
            updatedAt: new Date(),
          },
        })
        .returning();
      row = inserted;
    }

    const tagIdByName = await upsertTechTags(tx, input.tech);
    await tx.delete(projectTags).where(eq(projectTags.projectId, row.id));
    const links = input.tech
      .map(({ name }) => tagIdByName.get(name))
      .filter((id): id is number => id !== undefined)
      .map((tagId) => ({ projectId: row.id, tagId }));
    if (links.length > 0) await tx.insert(projectTags).values(links).onConflictDoNothing();

    await pruneOrphanTags(tx);
    return row;
  });
}

export async function deleteProjectById(id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const deleted = await tx.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
    await pruneOrphanTags(tx);
    return deleted.length > 0;
  });
}

const POST_COLUMNS = (p: PostWrite) => ({
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  status: p.status,
  featured: p.featured,
  publishedAt: p.publishedAt,
  coverImage: p.coverImage,
  content: p.content,
  readingMinutes: p.readingMinutes,
});

export async function upsertPostWithTags(input: PostWrite): Promise<PostRow> {
  return db.transaction(async (tx) => {
    const cols = POST_COLUMNS(input);
    let row: PostRow;
    if (input.id !== undefined) {
      const [updated] = await tx
        .update(posts)
        .set({ ...cols, updatedAt: new Date() })
        .where(eq(posts.id, input.id))
        .returning();
      if (!updated) throw new Error(`Post ${input.id} not found`);
      row = updated;
    } else {
      const [inserted] = await tx
        .insert(posts)
        .values(cols)
        .onConflictDoUpdate({
          target: posts.slug,
          set: {
            title: sql`excluded.title`,
            excerpt: sql`excluded.excerpt`,
            status: sql`excluded.status`,
            featured: sql`excluded.featured`,
            publishedAt: sql`excluded.published_at`,
            coverImage: sql`excluded.cover_image`,
            content: sql`excluded.content`,
            readingMinutes: sql`excluded.reading_minutes`,
            updatedAt: new Date(),
          },
        })
        .returning();
      row = inserted;
    }

    const tagIdByName = await upsertTopicTags(tx, input.tags);
    await tx.delete(postTags).where(eq(postTags.postId, row.id));
    const links = input.tags
      .map((name) => tagIdByName.get(name))
      .filter((id): id is number => id !== undefined)
      .map((tagId) => ({ postId: row.id, tagId }));
    if (links.length > 0) await tx.insert(postTags).values(links).onConflictDoNothing();

    await pruneOrphanTags(tx);
    return row;
  });
}

export async function deletePostById(id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const deleted = await tx.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
    await pruneOrphanTags(tx);
    return deleted.length > 0;
  });
}

export async function upsertTag(input: TagInput): Promise<TagRow> {
  const [row] = await db
    .insert(tags)
    .values({ name: input.name, kind: input.kind, iconUrl: input.iconUrl })
    .onConflictDoUpdate({
      target: tags.name,
      set: { kind: sql`excluded.kind`, iconUrl: sql`excluded.icon_url` },
    })
    .returning();
  return row;
}

export async function updateTag(id: number, input: TagInput): Promise<TagRow | null> {
  const [row] = await db
    .update(tags)
    .set({ name: input.name, kind: input.kind, iconUrl: input.iconUrl })
    .where(eq(tags.id, id))
    .returning();
  return row ?? null;
}

export async function deleteTag(id: number): Promise<boolean> {
  const deleted = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });
  return deleted.length > 0;
}

// Exported for callers that need to check tag existence before linking.
export { inArray };
