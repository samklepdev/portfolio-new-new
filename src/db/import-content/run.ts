import "dotenv/config";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { client, db } from "../index";
import { projects, tags, projectTags, posts, postTags } from "../schema";
import {
  getContentSlugs,
  getProjectContent,
  getPostContent,
} from "../../lib/content";
import { parseProjectRow, parsePostRow } from "./parse";
import type { ProjectImportRow, PostImportRow } from "./parse";

async function readProjects(): Promise<ProjectImportRow[]> {
  const slugs = await getContentSlugs("projects");
  const rows: ProjectImportRow[] = [];
  for (const slug of slugs.sort()) {
    const file = await getProjectContent(slug);
    if (!file) continue;
    rows.push(parseProjectRow(slug, file.frontmatter, file.body));
  }
  return rows;
}

async function readPosts(): Promise<PostImportRow[]> {
  const slugs = await getContentSlugs("posts");
  const rows: PostImportRow[] = [];
  for (const slug of slugs.sort()) {
    const file = await getPostContent(slug);
    if (!file) continue;
    rows.push(parsePostRow(slug, file.frontmatter, file.body));
  }
  return rows;
}

async function run() {
  const imported = await readProjects();
  if (imported.length === 0) {
    throw new Error(
      "No project content found in src/content/projects — refusing to wipe the database."
    );
  }
  console.log(`Read ${imported.length} project files.`);

  const importedPosts = await readPosts();
  console.log(`Read ${importedPosts.length} post files.`);

  // --- tech tags (kind: 'tech') ---
  const techByName = new Map<string, string | null>();
  for (const project of imported) {
    for (const { name, iconUrl } of project.tech) {
      if (!techByName.has(name)) techByName.set(name, iconUrl);
    }
  }

  const tagRows = await db
    .insert(tags)
    .values(
      [...techByName].map(([name, iconUrl]) => ({ name, kind: "tech", iconUrl }))
    )
    .onConflictDoUpdate({
      target: tags.name,
      set: { kind: sql`excluded.kind`, iconUrl: sql`excluded.icon_url` },
    })
    .returning();
  const tagIdByName = new Map(tagRows.map((tag) => [tag.name, tag.id]));
  console.log(`  ${tagRows.length} tech tags`);

  // --- projects (writes content + tab columns) ---
  const projectRows = await db
    .insert(projects)
    .values(
      imported.map((p) => ({
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        category: p.category,
        dateLabel: p.dateLabel,
        sortOrder: p.sortOrder,
        liveUrl: p.liveUrl,
        repoUrl: p.repoUrl,
        coverImage: p.coverImage,
        featured: p.featured,
        status: p.status,
        content: p.content,
        techDescription: p.techDescription,
        techTabImage: p.techTabImage,
        techTabImageAlt: p.techTabImageAlt,
        designDescription: p.designDescription,
        designTabImage: p.designTabImage,
        designTabImageAlt: p.designTabImageAlt,
      }))
    )
    .onConflictDoUpdate({
      target: projects.slug,
      set: {
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        category: sql`excluded.category`,
        dateLabel: sql`excluded.date_label`,
        sortOrder: sql`excluded.sort_order`,
        liveUrl: sql`excluded.live_url`,
        repoUrl: sql`excluded.repo_url`,
        coverImage: sql`excluded.cover_image`,
        featured: sql`excluded.featured`,
        status: sql`excluded.status`,
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
  const projectIdBySlug = new Map(projectRows.map((r) => [r.slug, r.id]));
  console.log(`  ${projectRows.length} projects`);

  let linkCount = 0;
  for (const project of imported) {
    const projectId = projectIdBySlug.get(project.slug);
    if (!projectId) continue;
    await db.delete(projectTags).where(eq(projectTags.projectId, projectId));
    const links = project.tech
      .map(({ name }) => tagIdByName.get(name))
      .filter((id): id is number => id !== undefined)
      .map((tagId) => ({ projectId, tagId }));
    if (links.length > 0) {
      await db.insert(projectTags).values(links).onConflictDoNothing();
      linkCount += links.length;
    }
  }
  console.log(`  ${linkCount} project/tag links`);

  // --- topic tags (kind: 'topic'); no-op kind on conflict ---
  const topicNames = [...new Set(importedPosts.flatMap((p) => p.tags))];
  const topicIdByName = new Map<string, number>();
  if (topicNames.length > 0) {
    const topicRows = await db
      .insert(tags)
      .values(topicNames.map((name) => ({ name, kind: "topic", iconUrl: null })))
      .onConflictDoUpdate({ target: tags.name, set: { name: sql`excluded.name` } })
      .returning();
    for (const tag of topicRows) topicIdByName.set(tag.name, tag.id);
    console.log(`  ${topicRows.length} topic tags`);
  }

  // --- posts (writes content) ---
  if (importedPosts.length > 0) {
    const postRows = await db
      .insert(posts)
      .values(
        importedPosts.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          publishedAt: p.publishedAt,
          coverImage: p.coverImage,
          featured: p.featured,
          status: p.status,
          readingMinutes: p.readingMinutes,
          content: p.content,
        }))
      )
      .onConflictDoUpdate({
        target: posts.slug,
        set: {
          title: sql`excluded.title`,
          excerpt: sql`excluded.excerpt`,
          publishedAt: sql`excluded.published_at`,
          coverImage: sql`excluded.cover_image`,
          featured: sql`excluded.featured`,
          status: sql`excluded.status`,
          readingMinutes: sql`excluded.reading_minutes`,
          content: sql`excluded.content`,
          updatedAt: new Date(),
        },
      })
      .returning();
    const postIdBySlug = new Map(postRows.map((r) => [r.slug, r.id]));
    console.log(`  ${postRows.length} posts`);

    let postLinkCount = 0;
    for (const post of importedPosts) {
      const postId = postIdBySlug.get(post.slug);
      if (!postId) continue;
      await db.delete(postTags).where(eq(postTags.postId, postId));
      const links = post.tags
        .map((name) => topicIdByName.get(name))
        .filter((id): id is number => id !== undefined)
        .map((tagId) => ({ postId, tagId }));
      if (links.length > 0) {
        await db.insert(postTags).values(links).onConflictDoNothing();
        postLinkCount += links.length;
      }
    }
    console.log(`  ${postLinkCount} post/tag links`);
  }

  // --- prune rows whose files are gone ---
  const keptPostSlugs =
    importedPosts.length > 0 ? importedPosts.map((p) => p.slug) : [""];
  const removedPosts = await db
    .delete(posts)
    .where(notInArray(posts.slug, keptPostSlugs))
    .returning({ slug: posts.slug });
  if (removedPosts.length > 0) {
    console.log(`  removed ${removedPosts.length} stale post(s)`);
  }

  const removed = await db
    .delete(projects)
    .where(notInArray(projects.slug, imported.map((p) => p.slug)))
    .returning({ slug: projects.slug });
  if (removed.length > 0) {
    console.log(`  removed ${removed.length} stale project(s)`);
  }

  // A tag is orphaned only when NEITHER projects NOR posts reference it.
  const orphanTags = await db
    .delete(tags)
    .where(
      and(
        notInArray(tags.id, db.select({ id: projectTags.tagId }).from(projectTags)),
        notInArray(tags.id, db.select({ id: postTags.tagId }).from(postTags))
      )
    )
    .returning({ name: tags.name });
  if (orphanTags.length > 0) {
    console.log(`  removed ${orphanTags.length} orphan tag(s)`);
  }

  console.log("Import complete.");
}

async function main() {
  if (process.env.IMPORT_CONFIRM !== "1") {
    console.error(
      "Refusing to run db:import.\n" +
        "This is a ONE-TIME migration, not a sync: it overwrites every project/post's\n" +
        "content and metadata from src/content/*.md and DELETES any project, post, or tag\n" +
        "not backed by a file. Re-running it after go-live erases admin-authored content.\n" +
        "If you are sure, set IMPORT_CONFIRM=1 to proceed."
    );
    process.exitCode = 1;
    return;
  }
  await run();
}

main()
  .catch((err) => {
    console.error("Import failed:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
