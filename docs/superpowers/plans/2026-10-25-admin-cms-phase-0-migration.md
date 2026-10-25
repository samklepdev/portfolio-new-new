# Admin CMS — Phase 0: Source-of-Truth Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the projects/posts long-form content (and the project Tech/Design tabs) out of MDX files and into Postgres, flip the detail pages to render from the DB, and demote `db:seed` to a dev-only bootstrap — so Postgres becomes the source of truth the admin CMS will write to.

**Architecture:** Add a `content` column (plus six project tab columns) to the schema. Build a one-time importer that reads the existing `src/content/**/*.md` files, parses frontmatter + body through pure, unit-tested mapping functions, and upserts rows by `slug` (reusing the existing seed's tag-relink + orphan-cleanup logic). Cut the two detail pages over to read from the DB row. Replace the file-reading seed with a tiny idempotent dev bootstrap, and rewrite the `CLAUDE.md` governing decision.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Drizzle ORM + postgres-js · drizzle-kit (migrations) · gray-matter · next-mdx-remote · vitest + @testing-library/react · tsx (scripts).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-25-admin-cms-design.md`.
- Styling is **CSS Modules, never Tailwind**. No `@tailwind`, no `tailwind.config.ts`, no postcss/autoprefixer. (No styling changes in this phase, but the rule stands.)
- Schema changes are `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`. **Never hand-edit a file in `drizzle/`** and never write DDL directly against the database. Commit the generated `drizzle/*.sql`.
- Seed/import idempotency: use `onConflictDoUpdate`, **never** `onConflictDoNothing` on a path whose `.returning()` rows are used downstream (a do-nothing conflict returns `[]` and silently breaks tag linking).
- Orphan-tag cleanup must check **both** `project_tags` **and** `post_tags` (checking only `project_tags` deletes every topic tag and cascades away post/tag links).
- `tags.name` is globally unique across `kind: 'tech'` and `'topic'`; the topic-tag upsert must **no-op `kind` on conflict** (do not flip a shared name's kind).
- One-off scripts import `client` from `src/db/index.ts` and `await client.end()` — never `process.exit()` out from under an open socket.
- Postgres sorts NULLs **first** on `DESC`; any ordering on a nullable column needs explicit `nulls last` + a stable tiebreak. (Unchanged here — existing `queries.ts` already does this.)
- Never run `npm run build` while `next dev` is running. Use `npm run build:verify` (writes to `.next-verify`). Builds and DB scripts need the container up: `npm run db:up`.
- Test runner is **vitest**: run a file with `npx vitest run <path>`. Tests mock `@/db/queries` and `@/lib/content` with `vi.mock`, and stub `next-mdx-remote/rsc`'s `MDXRemote` to echo its `source`.
- Commit after each task. End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Schema — add `content` + project tab columns, generate & apply migration

**Files:**
- Modify: `src/db/schema.ts` (the `projects` table ~lines 13-31, the `posts` table ~lines 91-103)
- Create (generated): `drizzle/NNNN_*.sql` (via `db:generate` — do not hand-write)

**Interfaces:**
- Produces: new nullable columns `projects.content`, `projects.techDescription`, `projects.techTabImage`, `projects.techTabImageAlt`, `projects.designDescription`, `projects.designTabImage`, `projects.designTabImageAlt`, and `posts.content`. Because `db.query.*` selects all columns, `getProjectBySlug`/`getPostBySlug` return these automatically — later tasks rely on `project.content`, `project.techDescription` (etc.) and `post.content` being present on the returned rows.

- [ ] **Step 1: Add the columns to `projects`**

In `src/db/schema.ts`, inside the `projects` table definition, add these after `coverImage` (before `createdAt`):

```ts
  coverImage: text("cover_image"),
  content: text("content"),
  techDescription: text("tech_description"),
  techTabImage: text("tech_tab_image"),
  techTabImageAlt: text("tech_tab_image_alt"),
  designDescription: text("design_description"),
  designTabImage: text("design_tab_image"),
  designTabImageAlt: text("design_tab_image_alt"),
```

- [ ] **Step 2: Add the column to `posts`**

In the `posts` table, add after `coverImage` (before `readingMinutes`):

```ts
  coverImage: text("cover_image"),
  content: text("content"),
```

- [ ] **Step 3: Start the DB and generate the migration**

Run: `npm run db:up && npm run db:generate`
Expected: drizzle-kit prints that it created a new file under `drizzle/` adding 8 columns. Open it and confirm it is only `ALTER TABLE ... ADD COLUMN` statements for the eight nullable `text` columns above — no drops, no `NOT NULL`.

- [ ] **Step 4: Apply the migration**

Run: `npm run db:migrate`
Expected: applies cleanly, no errors.

- [ ] **Step 5: Verify the columns exist and types still compile**

Run: `npx tsx -e "import {client,db} from './src/db/index.ts'; import {projects} from './src/db/schema.ts'; const r = await db.select({c: projects.content, t: projects.techDescription}).from(projects).limit(1); console.log('ok', r.length); await client.end();"`
Expected: prints `ok 0` (or `ok 1`) with no type/SQL error.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "Add content + project tab columns to schema

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Pure frontmatter → row mapping functions (TDD)

**Files:**
- Create: `src/db/import-content/parse.ts`
- Test: `src/db/import-content/parse.test.ts`

**Interfaces:**
- Consumes: `readingMinutes` from `src/lib/postFormat.ts` (`readingMinutes(body: string): number`).
- Produces:
  - `type ProjectImportRow` — `{ slug, title, summary, category, dateLabel, sortOrder, liveUrl, repoUrl, coverImage, featured, status, content, techDescription, techTabImage, techTabImageAlt, designDescription, designTabImage, designTabImageAlt, tech }` where `tech: { name: string; iconUrl: string | null }[]` and nullable fields are `string | null`.
  - `type PostImportRow` — `{ slug, title, excerpt, publishedAt, coverImage, featured, status, readingMinutes, content, tags }` where `tags: string[]`.
  - `function parseProjectRow(slug: string, frontmatter: Record<string, unknown>, body: string): ProjectImportRow` — **throws** `Error` if `title` or `excerpt` frontmatter is missing/blank.
  - `function parsePostRow(slug: string, frontmatter: Record<string, unknown>, body: string): PostImportRow` — **throws** `Error` if `title` or `excerpt` is missing/blank.
  - `const FEATURED_PROJECT_SLUGS: ReadonlySet<string>`.

- [ ] **Step 1: Write the failing test**

Create `src/db/import-content/parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseProjectRow, parsePostRow } from "./parse";

describe("parseProjectRow", () => {
  const fm = {
    title: "Build-On",
    excerpt: "A summary.",
    category: "Web",
    date: "2025",
    id: "3",
    link: "https://example.com",
    repo: "https://github.com/x/y",
    imageUrl: "/img/cover.png",
    tech1Name: "Next",
    tech1: "/icons/next.svg",
    techDescription: "How it was built.",
    techTabImg: "/img/tech.png",
    techTabImgAlt: "Tech diagram",
    designDescription: "How it looks.",
    designTabImg: "/img/design.png",
    designTabImgAlt: "Design mock",
  };

  it("maps frontmatter + body into a project row including tab columns", () => {
    const row = parseProjectRow("build-on", fm, "# Body\nText.");

    expect(row).toMatchObject({
      slug: "build-on",
      title: "Build-On",
      summary: "A summary.",
      category: "Web",
      dateLabel: "2025",
      sortOrder: 3,
      liveUrl: "https://example.com",
      repoUrl: "https://github.com/x/y",
      coverImage: "/img/cover.png",
      featured: true, // build-on is in FEATURED_PROJECT_SLUGS
      status: "published",
      content: "# Body\nText.",
      techDescription: "How it was built.",
      techTabImage: "/img/tech.png",
      techTabImageAlt: "Tech diagram",
      designDescription: "How it looks.",
      designTabImage: "/img/design.png",
      designTabImageAlt: "Design mock",
    });
    expect(row.tech).toEqual([{ name: "Next", iconUrl: "/icons/next.svg" }]);
  });

  it("nulls absent optional fields and marks non-featured slugs", () => {
    const row = parseProjectRow("misc", { title: "T", excerpt: "E" }, "body");
    expect(row.featured).toBe(false);
    expect(row.category).toBeNull();
    expect(row.techDescription).toBeNull();
    expect(row.tech).toEqual([]);
  });

  it("throws when a required field is missing", () => {
    expect(() => parseProjectRow("x", { title: "Only title" }, "b")).toThrow(/excerpt/);
  });
});

describe("parsePostRow", () => {
  it("maps frontmatter + body and computes reading time", () => {
    const row = parsePostRow(
      "hello",
      { title: "Hello", excerpt: "Hi", publishedAt: "2026-09-11", tags: ["Next", "Pi"] },
      "word ".repeat(400)
    );
    expect(row).toMatchObject({
      slug: "hello",
      title: "Hello",
      excerpt: "Hi",
      publishedAt: "2026-09-11",
      status: "published",
      tags: ["Next", "Pi"],
    });
    expect(row.content).toContain("word");
    expect(row.readingMinutes).toBeGreaterThan(1);
  });

  it("throws when a required field is missing", () => {
    expect(() => parsePostRow("x", { excerpt: "no title" }, "b")).toThrow(/title/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/import-content/parse.test.ts`
Expected: FAIL — cannot resolve `./parse`.

- [ ] **Step 3: Write the implementation**

Create `src/db/import-content/parse.ts`:

```ts
import { readingMinutes } from "../../lib/postFormat";

export const FEATURED_PROJECT_SLUGS: ReadonlySet<string> = new Set([
  "build-on",
  "gulf-winds",
  "otc",
]);

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

function required(value: unknown, field: string, slug: string): string {
  const v = str(value);
  if (!v) throw new Error(`${slug}: missing required frontmatter field "${field}"`);
  return v;
}

export type ProjectImportRow = {
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
  status: string;
  content: string;
  techDescription: string | null;
  techTabImage: string | null;
  techTabImageAlt: string | null;
  designDescription: string | null;
  designTabImage: string | null;
  designTabImageAlt: string | null;
  tech: { name: string; iconUrl: string | null }[];
};

export type PostImportRow = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  coverImage: string | null;
  featured: boolean;
  status: string;
  readingMinutes: number;
  content: string;
  tags: string[];
};

export function parseProjectRow(
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string
): ProjectImportRow {
  const fm = frontmatter;
  const title = required(fm.title, "title", slug);
  const summary = required(fm.excerpt, "excerpt", slug);

  const tech: ProjectImportRow["tech"] = [];
  for (let i = 1; i <= 5; i += 1) {
    const name = str(fm[`tech${i}Name`]);
    if (!name) continue;
    tech.push({ name, iconUrl: str(fm[`tech${i}`]) });
  }

  return {
    slug,
    title,
    summary,
    category: str(fm.category),
    dateLabel: str(fm.date),
    sortOrder: num(fm.id),
    liveUrl: str(fm.link),
    repoUrl: str(fm.repo),
    coverImage: str(fm.imageUrl),
    featured: FEATURED_PROJECT_SLUGS.has(slug),
    status: "published",
    content: body,
    techDescription: str(fm.techDescription),
    techTabImage: str(fm.techTabImg),
    techTabImageAlt: str(fm.techTabImgAlt),
    designDescription: str(fm.designDescription),
    designTabImage: str(fm.designTabImg),
    designTabImageAlt: str(fm.designTabImgAlt),
    tech,
  };
}

export function parsePostRow(
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string
): PostImportRow {
  const fm = frontmatter;
  const title = required(fm.title, "title", slug);
  const excerpt = required(fm.excerpt, "excerpt", slug);

  const tags = Array.isArray(fm.tags)
    ? fm.tags.map((tag) => str(tag)).filter((tag): tag is string => tag !== null)
    : [];

  return {
    slug,
    title,
    excerpt,
    publishedAt: str(fm.publishedAt),
    coverImage: str(fm.coverImage),
    featured: fm.featured === true,
    status: str(fm.status) ?? "published",
    readingMinutes: readingMinutes(body),
    content: body,
    tags,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/db/import-content/parse.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/db/import-content/parse.ts src/db/import-content/parse.test.ts
git commit -m "Add pure frontmatter-to-row mappers for content import

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The one-time importer script

**Files:**
- Create: `src/db/import-content/run.ts`
- Modify: `package.json` (add a `db:import` script)

**Interfaces:**
- Consumes: `parseProjectRow`, `parsePostRow`, `FEATURED_PROJECT_SLUGS` (Task 2); `getContentSlugs`, `getProjectContent`, `getPostContent` from `src/lib/content.ts` (each returns `{ body, frontmatter } | null`, or `string[]` for slugs); `client`, `db` from `src/db/index.ts`; the `projects`, `posts`, `tags`, `projectTags`, `postTags` tables.
- Produces: an executable script (`npm run db:import`) that writes every `src/content/**/*.md` into Postgres, including `content` and the six project tab columns. One-time migration; kept for reference.

- [ ] **Step 1: Write the importer**

Create `src/db/import-content/run.ts`:

```ts
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

run()
  .catch((err) => {
    console.error("Import failed:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
```

- [ ] **Step 2: Add the `db:import` script**

In `package.json` `scripts`, add after `"db:seed"`:

```json
    "db:seed": "tsx src/db/seed.ts",
    "db:import": "tsx src/db/import-content/run.ts",
```

- [ ] **Step 3: Run the importer against the local DB**

Run: `npm run db:up && npm run db:import`
Expected: prints `Read N project files.` / `Read M post files.`, tag/project/post/link counts, and `Import complete.` with a zero exit code. (M ≥ 2 — the two `pi-hosted-*` posts are included.)

- [ ] **Step 4: Verify idempotency and that content landed**

Run: `npm run db:import && npx tsx -e "import {client,db} from './src/db/index.ts'; import {projects,posts} from './src/db/schema.ts'; import {isNotNull,eq,and} from 'drizzle-orm'; const p = await db.select().from(projects); const withContent = p.filter(r=>r.content && r.content.length>0).length; const withTabs = p.filter(r=>r.designDescription).length; const po = await db.select().from(posts); console.log('projects', p.length, 'withContent', withContent, 'withDesignTab', withTabs); console.log('posts', po.length, 'withContent', po.filter(r=>r.content).length); await client.end();"`
Expected: a second import run succeeds (idempotent — no duplicate-key error); `withContent` equals the project count; `withDesignTab` is ≥ 1; every post has content.

- [ ] **Step 5: Commit**

```bash
git add src/db/import-content/run.ts package.json
git commit -m "Add one-time content importer (bodies + project tab columns to DB)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Cut the project detail page over to the DB (TDD)

**Files:**
- Modify: `src/app/projects/[slug]/page.tsx`
- Test: `src/app/projects/[slug]/page.test.tsx` (create)

**Interfaces:**
- Consumes: `getProjectBySlug`, `getPublishedProjects` from `@/db/queries` (the returned row now carries `content` and the six tab columns — Task 1); `resolvePublicImage` from `@/lib/content`.
- Produces: a detail page that renders `project.content` and builds tabs from the row's tab columns. No longer imports `getProjectContent` or `getContentSlugs`.

- [ ] **Step 1: Write the failing test**

Create `src/app/projects/[slug]/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedProject } from "@/db/queries";

const mocks = vi.hoisted(() => ({
  getProjectBySlug: vi.fn(),
  getPublishedProjects: vi.fn(),
  resolvePublicImage: vi.fn(),
}));

vi.mock("@/db/queries", () => ({
  getProjectBySlug: mocks.getProjectBySlug,
  getPublishedProjects: mocks.getPublishedProjects,
}));

vi.mock("@/lib/content", () => ({
  resolvePublicImage: mocks.resolvePublicImage,
}));

vi.mock("next-mdx-remote/rsc", () => ({
  MDXRemote: ({ source }: { source: string }) => <div data-testid="mdx">{source}</div>,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import ProjectPage, { generateStaticParams } from "./page";

const project = {
  id: 1,
  slug: "build-on",
  title: "Build-On",
  summary: "A summary.",
  status: "published",
  featured: true,
  role: "Lead",
  category: "Web",
  dateLabel: "2025",
  sortOrder: 3,
  startedAt: null,
  completedAt: null,
  repoUrl: null,
  liveUrl: null,
  coverImage: null,
  content: "Case study body.",
  techDescription: "How it was built.",
  techTabImage: null,
  techTabImageAlt: null,
  designDescription: "How it looks.",
  designTabImage: null,
  designTabImageAlt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  projectTags: [{ tag: { id: 3, name: "Next", kind: "tech", iconUrl: null } }],
  metrics: [],
} as unknown as PublishedProject;

const renderPage = async (slug: string) =>
  render(await ProjectPage({ params: Promise.resolve({ slug }) }));

describe("ProjectPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePublicImage.mockResolvedValue(null);
  });

  it("renders the body from the DB content column", async () => {
    mocks.getProjectBySlug.mockResolvedValue(project);
    await renderPage("build-on");
    expect(screen.getByRole("heading", { level: 1, name: "Build-On" })).toBeInTheDocument();
    expect(screen.getAllByTestId("mdx")[0]).toHaveTextContent("Case study body.");
  });

  it("builds tabs from the row's tab columns", async () => {
    mocks.getProjectBySlug.mockResolvedValue(project);
    await renderPage("build-on");
    expect(screen.getByText("How it was built.")).toBeInTheDocument();
    expect(screen.getByText("How it looks.")).toBeInTheDocument();
  });

  it("404s when content is empty", async () => {
    mocks.getProjectBySlug.mockResolvedValue({ ...project, content: null });
    await expect(renderPage("build-on")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s on a draft", async () => {
    mocks.getProjectBySlug.mockResolvedValue({ ...project, status: "draft" });
    await expect(renderPage("build-on")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("generateStaticParams", () => {
  it("prerenders only published slugs that have content", async () => {
    mocks.getPublishedProjects.mockResolvedValue([
      { ...project, slug: "has-content" },
      { ...project, slug: "no-content", content: null },
    ]);
    expect(await generateStaticParams()).toEqual([{ slug: "has-content" }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/projects/[slug]/page.test.tsx"`
Expected: FAIL — the page still imports `getProjectContent`/`getContentSlugs` and reads `content.body`/`content.frontmatter`, so the mocks don't match and tabs don't render.

- [ ] **Step 3: Update the page to read from the DB**

In `src/app/projects/[slug]/page.tsx`:

Replace the content imports (lines 6-10) — drop `getContentSlugs` and `getProjectContent`, keep `resolvePublicImage`:

```tsx
import { getProjectBySlug, getPublishedProjects } from "@/db/queries";
import { resolvePublicImage } from "@/lib/content";
import { ProjectTabs, type ProjectTab } from "@/components/projects/ProjectTabs";
```

Replace `generateStaticParams` (lines 22-32):

```tsx
export async function generateStaticParams() {
  const projects = await getPublishedProjects();
  return projects
    .filter((project) => Boolean(project.content))
    .map((project) => ({ slug: project.slug }));
}
```

Replace the body of `ProjectPage` from the data fetch through the guard and the `buildTabs` call (lines 50-63):

```tsx
export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;

  const project = await getProjectBySlug(slug);

  if (!project || project.status !== "published" || !project.content) {
    notFound();
  }

  const tags = project.projectTags.map((pt) => pt.tag);
  const tabs = await buildTabs(project);
```

Then change the article to render `project.content`:

```tsx
      <article className={prose.prose}>
        <MDXRemote source={project.content} />
      </article>
```

Finally rewrite `buildTabs` (lines 132-172) to read the row columns instead of frontmatter:

```tsx
async function buildTabs(project: {
  techDescription: string | null;
  techTabImage: string | null;
  techTabImageAlt: string | null;
  designDescription: string | null;
  designTabImage: string | null;
  designTabImageAlt: string | null;
}): Promise<ProjectTab[]> {
  const sources = [
    {
      id: "tech",
      label: "Tech",
      description: project.techDescription,
      image: project.techTabImage,
      alt: project.techTabImageAlt,
    },
    {
      id: "design",
      label: "Design",
      description: project.designDescription,
      image: project.designTabImage,
      alt: project.designTabImageAlt,
    },
  ];

  const tabs: ProjectTab[] = [];

  for (const source of sources) {
    if (typeof source.description !== "string" || !source.description.trim()) {
      continue;
    }

    const src = await resolvePublicImage(source.image);

    tabs.push({
      id: source.id,
      label: source.label,
      image: src
        ? { src, alt: typeof source.alt === "string" ? source.alt : "" }
        : null,
      content: <MDXRemote source={source.description} />,
    });
  }

  return tabs;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/projects/[slug]/page.test.tsx"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/projects/[slug]/page.tsx" "src/app/projects/[slug]/page.test.tsx"
git commit -m "Render project case study + tabs from the DB, not MDX files

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Cut the blog detail page over to the DB (TDD)

**Files:**
- Modify: `src/app/blog/[slug]/page.tsx`
- Modify: `src/app/blog/[slug]/page.test.tsx`

**Interfaces:**
- Consumes: `getPostBySlug`, `getPublishedPosts` from `@/db/queries` (row now carries `content`); `resolvePublicImage` from `@/lib/content`.
- Produces: a blog detail page rendering `post.content`; no longer imports `getPostContent`/`getContentSlugs`.

- [ ] **Step 1: Update the test first (red)**

In `src/app/blog/[slug]/page.test.tsx`:

Replace the `vi.hoisted` + mock blocks (lines 5-22) so content comes from the DB mock:

```tsx
const mocks = vi.hoisted(() => ({
  getPostBySlug: vi.fn(),
  getPublishedPosts: vi.fn(),
  resolvePublicImage: vi.fn(),
}));

vi.mock("@/db/queries", () => ({
  getPostBySlug: mocks.getPostBySlug,
  getPublishedPosts: mocks.getPublishedPosts,
}));

vi.mock("@/lib/content", () => ({
  resolvePublicImage: mocks.resolvePublicImage,
}));
```

Add `content` to the `post` fixture (after `readingMinutes: 4,`):

```tsx
  readingMinutes: 4,
  content: "Body text.",
```

Rewrite the body-dependent cases to stop mocking `getPostContent`:

```tsx
  it("renders the post header and body", async () => {
    mocks.getPostBySlug.mockResolvedValue(post);
    await renderPage("hello-world");
    expect(screen.getByRole("heading", { level: 1, name: "Hello World" })).toBeInTheDocument();
    expect(screen.getByText(/September 11, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/4 min read/)).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByTestId("mdx")).toHaveTextContent("Body text.");
  });

  it("links back to the blog index", async () => {
    mocks.getPostBySlug.mockResolvedValue(post);
    await renderPage("hello-world");
    expect(screen.getByRole("link", { name: /Blog/ })).toHaveAttribute("href", "/blog");
  });

  it("404s when the row is missing", async () => {
    mocks.getPostBySlug.mockResolvedValue(undefined);
    await expect(renderPage("nope")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s when the row is a draft", async () => {
    mocks.getPostBySlug.mockResolvedValue({ ...post, status: "draft" });
    await expect(renderPage("hello-world")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s when content is empty", async () => {
    mocks.getPostBySlug.mockResolvedValue({ ...post, content: null });
    await expect(renderPage("hello-world")).rejects.toThrow("NEXT_NOT_FOUND");
  });
```

Rewrite `generateStaticParams` test to drop `getContentSlugs`:

```tsx
describe("generateStaticParams", () => {
  it("prerenders only published slugs that have content", async () => {
    mocks.getPublishedPosts.mockResolvedValue([
      { ...post, slug: "has-content" },
      { ...post, slug: "no-content", content: null },
    ]);
    expect(await generateStaticParams()).toEqual([{ slug: "has-content" }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/blog/[slug]/page.test.tsx"`
Expected: FAIL — the page still reads from `getPostContent`.

- [ ] **Step 3: Update the page**

In `src/app/blog/[slug]/page.tsx`:

Replace the imports (lines 6-7):

```tsx
import { getPostBySlug, getPublishedPosts } from "@/db/queries";
import { resolvePublicImage } from "@/lib/content";
```

Replace `generateStaticParams` (lines 19-31):

```tsx
export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts
    .filter((post) => Boolean(post.content))
    .map((post) => ({ slug: post.slug }));
}
```

Replace the fetch + guard (lines 47-57):

```tsx
export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await getPostBySlug(slug);

  if (!post || post.status !== "published" || !post.content) {
    notFound();
  }
```

Render `post.content` (line 105):

```tsx
      <article className={prose.prose}>
        <MDXRemote source={post.content} />
      </article>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/blog/[slug]/page.test.tsx"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/blog/[slug]/page.tsx" "src/app/blog/[slug]/page.test.tsx"
git commit -m "Render blog post body from the DB, not MDX files

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Demote the seed to a dev bootstrap, and rewrite the governing decision

**Files:**
- Modify: `src/db/seed.ts` (replace the file-reading importer with a tiny bootstrap)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `client`, `db`, the `projects`/`posts` tables.
- Produces: an idempotent `db:seed` that inserts one sample project + one sample post into an empty dev DB and does nothing destructive — no longer the source of truth, no file reads.

- [ ] **Step 1: Replace `src/db/seed.ts` with a dev bootstrap**

Overwrite `src/db/seed.ts` with:

```ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import { client, db } from "./index";
import { projects, posts } from "./schema";

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

  console.log("Dev bootstrap complete (sample-project, sample-post).");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
```

- [ ] **Step 2: Verify the seed is idempotent**

Run: `npm run db:seed && npm run db:seed`
Expected: both runs print `Dev bootstrap complete …`, exit 0, no duplicate-key error.

- [ ] **Step 3: Rewrite the governing decision in `CLAUDE.md`**

In `CLAUDE.md`, replace the paragraph that currently reads:

> Replaces an earlier Express/Sequelize CMS (`port-new`). The governing decision: **no build-your-own CMS.** Long-form content lives in MDX files in this repo; Postgres holds only queryable metadata (tags, dates, status, links). The two are joined by `slug`. There is no admin CRUD app and adding one would undo the point of the rebuild.

with:

```markdown
Replaces an earlier Express/Sequelize CMS (`port-new`). **Postgres is the source of
truth**, and `/admin` is the CMS that writes to it: long-form content (project case
studies, blog posts) lives in the `content` column of `projects`/`posts`, alongside the
queryable metadata (tags, dates, status, links). The MDX files under `src/content/` were
the original source and were migrated into the DB once via `npm run db:import`
(`src/db/import-content/`); they are now a historical backup, not read at runtime.

`npm run db:seed` is a **dev-only bootstrap** that inserts a couple of sample rows into a
fresh local database. It is NOT the source of truth and must never be treated as one —
re-running it must never be a way to "restore" content, because it would not contain the
real content. The admin edits the database directly; see
`docs/superpowers/specs/2026-10-25-admin-cms-design.md`.
```

- [ ] **Step 4: Update the Commands section note in `CLAUDE.md`**

In the `## Commands` block, replace the seed line:

```bash
npm run db:seed             # idempotent, safe to re-run
```

with:

```bash
npm run db:seed             # dev-only bootstrap (sample rows); NOT the source of truth
npm run db:import           # one-time: migrate src/content/*.md into the DB
```

- [ ] **Step 5: Full verification build**

Run: `npm run db:up && npx vitest run && npm run build:verify`
Expected: all vitest suites pass; `build:verify` completes with no error (it type-checks, lints, and prerenders `/projects/[slug]` and `/blog/[slug]` from the DB). Do **not** run plain `npm run build` if `next dev` is up.

- [ ] **Step 6: Commit**

```bash
git add src/db/seed.ts CLAUDE.md
git commit -m "Demote db:seed to dev bootstrap; make Postgres the source of truth

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Phase 0 section of the spec):**
- `content` column on projects + posts → Task 1. ✅
- Six project Tech/Design tab columns (spec amendment) → Task 1; written by Task 3; read by Task 4. ✅
- Importer reading `src/content/**`, slug-upsert, `onConflictDoUpdate`, tag relink, both-join orphan cleanup, `client.end()`, fail-loud on malformed → Task 2 (fail-loud `required()` + pure mappers) and Task 3 (DB orchestration). ✅
- Read-path cutover (detail pages render body from DB; `generateStaticParams` gates on content) → Tasks 4 & 5. ✅
- `src/lib/content.ts` reduced to importer-only use: after Tasks 4-5, its only remaining consumers are the importer (`getContentSlugs`/`getProjectContent`/`getPostContent`) and the pages (`resolvePublicImage`). Left in place intentionally; no task deletes it. ✅
- `db:seed` → dev bootstrap, stays idempotent → Task 6. ✅
- `CLAUDE.md` governing-decision rewrite → Task 6. ✅
- Builds need `db:up`; use `build:verify` → Task 6 Step 5 + Global Constraints. ✅

**Placeholder scan:** No TBD/TODO; every code step contains full code; every command has an expected result. ✅

**Type consistency:** `ProjectImportRow`/`PostImportRow` field names (Task 2) match the `.values({...})` keys and `excluded.*` column names in Task 3, and match the DB column names added in Task 1 (`tech_description` ↔ `techDescription`, etc.). The page test fixtures (Tasks 4-5) include `content` + tab fields so they type-check against `PublishedProject`/`PublishedPost`. `buildTabs` param shape (Task 4) matches the row columns. ✅

**Note for the implementer:** Task 1 must apply before Task 3 runs (the importer writes the new columns) and before Tasks 4-5 type-check (`PublishedProject`/`PublishedPost` gain `content`). Execute tasks in order.
