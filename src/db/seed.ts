import "dotenv/config";
import { eq, notInArray, sql } from "drizzle-orm";
import { client, db } from "./index";
import { projects, tags, projectTags } from "./schema";
import { getContentSlugs, getProjectContent } from "../lib/content";

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
  const slugs = await getContentSlugs();
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

async function seed() {
  const imported = await readProjects();

  if (imported.length === 0) {
    throw new Error(
      "No project content found in src/content/projects — refusing to wipe the database."
    );
  }

  console.log(`Read ${imported.length} project files.`);

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

  const orphanTags = await db
    .delete(tags)
    .where(
      notInArray(
        tags.id,
        db.select({ id: projectTags.tagId }).from(projectTags)
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
