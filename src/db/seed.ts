import "dotenv/config";
import { sql } from "drizzle-orm";
import { client, db } from "./index";
import { projects, tags, projectTags } from "./schema";

// Seeds are upserts, not plain inserts: `onConflictDoNothing().returning()`
// returns only the rows it actually wrote, so on a second run it hands back an
// empty array and the tag/project linking below silently does nothing.
// `onConflictDoUpdate` always returns the row, which keeps re-runs idempotent
// and lets edits here propagate to an already-seeded database.

const TAGS = [
  { name: "TypeScript", kind: "language" },
  { name: "React", kind: "framework" },
  { name: "Next.js", kind: "framework" },
  { name: "C#", kind: "language" },
  { name: ".NET", kind: "framework" },
  { name: "PostgreSQL", kind: "domain" },
  { name: "React Native", kind: "framework" },
  { name: "Bitcoin", kind: "domain" },
  { name: "Clean Architecture", kind: "domain" },
];

const PROJECTS = [
  {
    slug: "bitcoin-storefront",
    title: "Bitcoin Storefront",
    summary:
      "Next.js e-commerce storefront with non-custodial Bitcoin payments, built on Clean Architecture / DDD.",
    featured: true,
    role: "Solo dev",
    repoUrl: "https://github.com/samklepdev/bitcoin-storefront",
  },
  {
    slug: "veo-design-studio",
    title: "VEO Design Studio",
    summary:
      "Home visualization and buyer selection platform built for BuildOn Technologies.",
    featured: true,
    role: "Senior Engineer",
  },
  {
    slug: "steady-mat-app",
    title: "Steady",
    summary:
      "React Native / Expo mobile app supporting people on medication-assisted treatment.",
    role: "Solo dev",
  },
  {
    slug: "portfolio-cms",
    title: "Portfolio CMS",
    summary:
      "Custom TypeScript/Express/PostgreSQL backend with JWT/RBAC auth powering an earlier version of this site.",
    role: "Solo dev",
    liveUrl: "https://samklep.dev",
  },
];

const TAGS_BY_PROJECT_SLUG: Record<string, string[]> = {
  "bitcoin-storefront": ["TypeScript", "Next.js", "React", "Bitcoin", "Clean Architecture"],
  "veo-design-studio": ["TypeScript", "React", "C#", ".NET"],
  "steady-mat-app": ["TypeScript", "React Native"],
  "portfolio-cms": ["TypeScript", "React", "PostgreSQL"],
};

async function seed() {
  console.log("Seeding tags...");

  const tagRows = await db
    .insert(tags)
    .values(TAGS)
    .onConflictDoUpdate({
      target: tags.name,
      set: { kind: sql`excluded.kind` },
    })
    .returning();

  const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

  console.log(`  ${tagRows.length} tags`);
  console.log("Seeding projects...");

  const projectRows = await db
    .insert(projects)
    .values(PROJECTS)
    .onConflictDoUpdate({
      target: projects.slug,
      set: {
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        featured: sql`excluded.featured`,
        role: sql`excluded.role`,
        repoUrl: sql`excluded.repo_url`,
        liveUrl: sql`excluded.live_url`,
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log(`  ${projectRows.length} projects`);
  console.log("Linking tags to projects...");

  const links = projectRows.flatMap((project) =>
    (TAGS_BY_PROJECT_SLUG[project.slug] ?? []).flatMap((name) => {
      const tagId = tagIdByName.get(name);
      if (!tagId) {
        console.warn(`  skipping unknown tag "${name}" on ${project.slug}`);
        return [];
      }
      return [{ projectId: project.id, tagId }];
    })
  );

  if (links.length > 0) {
    await db.insert(projectTags).values(links).onConflictDoNothing();
  }

  console.log(`  ${links.length} project/tag links`);
  console.log("Seed complete.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
