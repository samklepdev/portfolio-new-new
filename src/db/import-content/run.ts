import "dotenv/config";
import { and, notInArray } from "drizzle-orm";
import { client, db } from "../index";
import { projects, tags, projectTags, posts, postTags } from "../schema";
import {
  getContentSlugs,
  getProjectContent,
  getPostContent,
} from "../../lib/content";
import { parseProjectRow, parsePostRow } from "./parse";
import type { ProjectImportRow, PostImportRow } from "./parse";
import { upsertProjectWithTags, upsertPostWithTags } from "../content-write";

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

  // --- projects: one write path, shared with the admin API ---
  let linkCount = 0;
  for (const p of imported) {
    await upsertProjectWithTags({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      status: p.status,
      featured: p.featured,
      category: p.category,
      role: null,
      dateLabel: p.dateLabel,
      sortOrder: p.sortOrder,
      startedAt: null,
      completedAt: null,
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
      tech: p.tech,
    });
    linkCount += p.tech.length;
  }
  console.log(`  ${imported.length} projects, ~${linkCount} project/tag links`);

  // --- posts: shared write path ---
  if (importedPosts.length > 0) {
    for (const p of importedPosts) {
      await upsertPostWithTags({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        status: p.status,
        featured: p.featured,
        publishedAt: p.publishedAt,
        coverImage: p.coverImage,
        content: p.content,
        readingMinutes: p.readingMinutes,
        tags: p.tags,
      });
    }
    console.log(`  ${importedPosts.length} posts`);
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
