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

  const seedThemes = [
    { name: "CyberPunk", background: "#0b0e14", foreground: "#ffffff", turquoise: "#00f0ff",
      pink: "#ff2e97", purple: "#b026ff", green: "#39ff88", heroPreset: "orbit", isPublic: true, isActive: true },
    { name: "Ember", background: "#140b0a", foreground: "#fff4ec", turquoise: "#ff7a18",
      pink: "#ff2e63", purple: "#b5179e", green: "#4ade80", heroPreset: "pulse", isPublic: true, isActive: false },
    { name: "Synthwave", background: "#120a1e", foreground: "#f6f0ff", turquoise: "#c05cff",
      pink: "#ff5bd1", purple: "#3ab0ff", green: "#35e07f", heroPreset: "wave", isPublic: true, isActive: false },
  ];

  for (const t of seedThemes) {
    await db
      .insert(themes)
      .values(t)
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
          isPublic: sql`excluded.is_public`,
        },
      });
  }

  console.log("Dev bootstrap complete (sample-project, sample-post, sample theme).");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
