import "dotenv/config";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { client, db } from "./index";
import { projects, tags, projectTags, posts, postTags } from "./schema";
import {
  getContentSlugs,
  getProjectContent,
  getPostContent,
} from "../lib/content";
import { readingMinutes } from "../lib/postFormat";

const FEATURED_SLUGS = new Set(["build-on", "gulf-winds", "otc"]);

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

type ImportedProject = {
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  dateLabel: string | null;
  sortOrder: number;
  liveUrl: string | null;
  repoUrl: string | null;
  coverImage: string | null;
  featured: boolean;
  tech: { name: string; iconUrl: string | null }[];
};

async function readProjects(): Promise<ImportedProject[]> {
  const slugs = await getContentSlugs("projects");
  const parsed: ImportedProject[] = [];

  for (const slug of slugs.sort()) {
    const content = await getProjectContent(slug);
    if (!content) continue;

    const fm = content.frontmatter;
    const title = str(fm.title);
    const summary = str(fm.excerpt);

    if (!title || !summary) {
      console.warn(`  skipping ${slug}: missing ${!title ? "title" : "excerpt"}`);
      continue;
    }

    const tech: ImportedProject["tech"] = [];
    for (let i = 1; i <= 5; i += 1) {
      const name = str(fm[`tech${i}Name`]);
      if (!name) continue;
      tech.push({ name, iconUrl: str(fm[`tech${i}`]) });
    }

    parsed.push({
      slug,
      title,
      summary,
      category: str(fm.category),
      dateLabel: str(fm.date),
      sortOrder: num(fm.id),
      liveUrl: str(fm.link),
      repoUrl: str(fm.repo),
      coverImage: str(fm.imageUrl),
      featured: FEATURED_SLUGS.has(slug),
      tech,
    });
  }

  return parsed;
}

type ImportedPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  coverImage: string | null;
  featured: boolean;
  status: string;
  readingMinutes: number;
  tags: string[];
};

async function readPosts(): Promise<ImportedPost[]> {
  const slugs = await getContentSlugs("posts");
  const parsed: ImportedPost[] = [];

  for (const slug of slugs.sort()) {
    const content = await getPostContent(slug);
    if (!content) continue;

    const fm = content.frontmatter;
    const title = str(fm.title);
    const excerpt = str(fm.excerpt);

    if (!title || !excerpt) {
      console.warn(`  skipping ${slug}: missing ${!title ? "title" : "excerpt"}`);
      continue;
    }

    const postTagNames = Array.isArray(fm.tags)
      ? fm.tags.map((tag) => str(tag)).filter((tag): tag is string => tag !== null)
      : [];

    parsed.push({
      slug,
      title,
      excerpt,
      publishedAt: str(fm.publishedAt),
      coverImage: str(fm.coverImage),
      featured: fm.featured === true,
      status: str(fm.status) ?? "published",
      readingMinutes: readingMinutes(content.body),
      tags: postTagNames,
    });
  }

  return parsed;
}

async function seed() {
  const imported = await readProjects();

  if (imported.length === 0) {
    throw new Error(
      "No project content found in src/content/projects — refusing to wipe the database."
    );
  }

  console.log(`Read ${imported.length} project files.`);

  const importedPosts = await readPosts();
  console.log(`Read ${importedPosts.length} post files.`);

  const techByName = new Map<string, string | null>();
  for (const project of imported) {
    for (const { name, iconUrl } of project.tech) {
      if (!techByName.has(name)) techByName.set(name, iconUrl);
    }
  }

  const tagRows = await db
    .insert(tags)
    .values(
      [...techByName].map(([name, iconUrl]) => ({
        name,
        kind: "tech",
        iconUrl,
      }))
    )
    .onConflictDoUpdate({
      target: tags.name,
      set: { kind: sql`excluded.kind`, iconUrl: sql`excluded.icon_url` },
    })
    .returning();

  const tagIdByName = new Map(tagRows.map((tag) => [tag.name, tag.id]));
  console.log(`  ${tagRows.length} tech tags`);

  const projectRows = await db
    .insert(projects)
    .values(
      imported.map((project) => ({
        slug: project.slug,
        title: project.title,
        summary: project.summary,
        category: project.category,
        dateLabel: project.dateLabel,
        sortOrder: project.sortOrder,
        liveUrl: project.liveUrl,
        repoUrl: project.repoUrl,
        coverImage: project.coverImage,
        featured: project.featured,
        status: "published",
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
        updatedAt: new Date(),
      },
    })
    .returning();

  const projectIdBySlug = new Map(projectRows.map((row) => [row.slug, row.id]));
  console.log(`  ${projectRows.length} projects`);

  let linkCount = 0;
  for (const project of imported) {
    const projectId = projectIdBySlug.get(project.slug);
    if (!projectId) continue;

    await db.delete(projectTags).where(eq(projectTags.projectId, projectId));

    const links = project.tech
      .map(({ name }) => tagIdByName.get(name))
      .filter((tagId): tagId is number => tagId !== undefined)
      .map((tagId) => ({ projectId, tagId }));

    if (links.length > 0) {
      await db.insert(projectTags).values(links).onConflictDoNothing();
      linkCount += links.length;
    }
  }
  console.log(`  ${linkCount} project/tag links`);

  const topicNames = [...new Set(importedPosts.flatMap((post) => post.tags))];
  const topicIdByName = new Map<string, number>();

  if (topicNames.length > 0) {
    const topicRows = await db
      .insert(tags)
      .values(topicNames.map((name) => ({ name, kind: "topic", iconUrl: null })))
      .onConflictDoUpdate({
        target: tags.name,
        set: { name: sql`excluded.name` },
      })
      .returning();

    for (const tag of topicRows) topicIdByName.set(tag.name, tag.id);
    console.log(`  ${topicRows.length} topic tags`);
  }

  if (importedPosts.length > 0) {
    const postRows = await db
      .insert(posts)
      .values(
        importedPosts.map((post) => ({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          publishedAt: post.publishedAt,
          coverImage: post.coverImage,
          featured: post.featured,
          status: post.status,
          readingMinutes: post.readingMinutes,
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
          updatedAt: new Date(),
        },
      })
      .returning();

    const postIdBySlug = new Map(postRows.map((row) => [row.slug, row.id]));
    console.log(`  ${postRows.length} posts`);

    let postLinkCount = 0;
    for (const post of importedPosts) {
      const postId = postIdBySlug.get(post.slug);
      if (!postId) continue;

      await db.delete(postTags).where(eq(postTags.postId, postId));

      const links = post.tags
        .map((name) => topicIdByName.get(name))
        .filter((tagId): tagId is number => tagId !== undefined)
        .map((tagId) => ({ postId, tagId }));

      if (links.length > 0) {
        await db.insert(postTags).values(links).onConflictDoNothing();
        postLinkCount += links.length;
      }
    }
    console.log(`  ${postLinkCount} post/tag links`);
  }

  const removedPosts = await db
    .delete(posts)
    .where(
      notInArray(
        posts.slug,
        importedPosts.length > 0
          ? importedPosts.map((post) => post.slug)
          : [""]
      )
    )
    .returning({ slug: posts.slug });

  if (removedPosts.length > 0) {
    console.log(
      `  removed ${removedPosts.length} stale post(s): ${removedPosts
        .map((row) => row.slug)
        .join(", ")}`
    );
  }

  const removed = await db
    .delete(projects)
    .where(
      notInArray(
        projects.slug,
        imported.map((project) => project.slug)
      )
    )
    .returning({ slug: projects.slug });

  if (removed.length > 0) {
    console.log(
      `  removed ${removed.length} stale project(s): ${removed
        .map((row) => row.slug)
        .join(", ")}`
    );
  }

  // A tag is orphaned only when NEITHER projects NOR posts reference it.
  // Checking project_tags alone would delete every topic tag on every run —
  // and post_tags.tag_id is ON DELETE CASCADE, so it would silently take the
  // post/tag links with it.
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
    console.log(
      `  removed ${orphanTags.length} orphan tag(s): ${orphanTags
        .map((row) => row.name)
        .join(", ")}`
    );
  }

  console.log("Import complete.");
}

seed()
  .catch((err) => {
    console.error("Import failed:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
