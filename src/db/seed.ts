import "dotenv/config";
import { sql } from "drizzle-orm";
import { client, db } from "./index";
import { projects, posts, themes } from "./schema";

// Dev-only bootstrap. Postgres is the source of truth; the real content lives
// in the DB (authored via /admin, migrated once via `npm run db:import`). This
// seed only gives a freshly-created dev database a row to look at. It is
// idempotent (onConflictDoUpdate) and never deletes anything.
async function seed() {
  await db
    .insert(projects)
    .values({
      slug: "sample-project",
      title: "Sample Project",
      summary: "A placeholder project for local development.",
      status: "draft",
      featured: false,
      content: "# Sample\n\nThis is seeded local content.",
    })
    .onConflictDoUpdate({
      target: projects.slug,
      set: { title: sql`excluded.title`, updatedAt: new Date() },
    });

  await db
    .insert(posts)
    .values({
      slug: "sample-post",
      title: "Sample Post",
      excerpt: "A placeholder post for local development.",
      status: "draft",
      featured: false,
      publishedAt: "2026-01-01",
      readingMinutes: 1,
      content: "Seeded local content.",
    })
    .onConflictDoUpdate({
      target: posts.slug,
      set: { title: sql`excluded.title`, updatedAt: new Date() },
    });

  await db
    .insert(themes)
    .values({
      name: "Sunset",
      background: "#140b0e",
      foreground: "#fff6f0",
      turquoise: "#ffb347",
      pink: "#ff5e7e",
      purple: "#c04cfd",
      green: "#39ff88",
      heroPreset: "pulse",
      isActive: false,
    })
    .onConflictDoUpdate({
      target: themes.name,
      set: {
        background: sql`excluded.background`,
        foreground: sql`excluded.foreground`,
        turquoise: sql`excluded.turquoise`,
        pink: sql`excluded.pink`,
        purple: sql`excluded.purple`,
        green: sql`excluded.green`,
        heroPreset: sql`excluded.hero_preset`,
      },
    });

  console.log("Dev bootstrap complete (sample-project, sample-post, sample theme).");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
