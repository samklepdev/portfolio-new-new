# Admin CMS — Phase 2: Service & API Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose every admin resource (projects, posts, tags, read-only submissions) through an authenticated `/api/admin/[resource]` route layer, backed by one shared Postgres write path, and consumed by a typed service layer built on a finished `BaseApiService`.

**Architecture:** Route handlers under `src/app/api/admin/` re-check the session cookie (defense in depth over the Phase 1 middleware), validate the body with small per-resource TypeScript guards (no `zod`), and call a thin DB layer: reads in `src/db/admin-queries.ts` (admin sees drafts too, unlike the public `queries.ts`), writes in `src/db/content-write.ts`. The project/post write is a transaction-wrapped slug-upsert + tag-relink extracted from the one-time importer so admin edits and `db:import` share a single code path. On the client, each resource gets a few-line service (`ProjectService`, `PostService`, `TagService`, `SubmissionService`) extending a cleaned-up `BaseApiService` whose non-2xx responses normalize to a typed `ApiError`.

**Tech Stack:** Next.js 15.5 (App Router route handlers, Node runtime) · React 19 · TypeScript · Drizzle ORM + `postgres` (postgres-js) · `axios` (already in the tree) · `jose` session verify (Phase 1) · vitest + @testing-library/react.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-25-admin-cms-design.md` (Phase 2 section). Phase 0 (content/tab columns, `contact_submissions`) and Phase 1 (auth, middleware, `src/lib/adminSession.ts`) are merged on `main`.
- **Postgres is the source of truth; `/admin` is the CMS.** `db:seed` is dev bootstrap only; `db:import` is a destructive one-time migration — NEVER run `db:import` as a sync, and NEVER run it in automated tests against the dev database.
- **No new dependencies.** `axios` and `jose` are already present. No `zod`, no UI/validation library.
- **Styling is CSS Modules, never Tailwind** (no UI in this phase, but keep the rule in mind for any stray markup).
- **Test runner is vitest:** run a file with `npx vitest run <path>`. The repo convention is that **DB-access modules are NOT unit-tested in isolation** — there is no test-DB harness and `src/db/queries.ts` has no test file. Consumers (routes here, pages elsewhere) mock the DB module with `vi.hoisted()` + `vi.mock("@/db/...")`. `content-write.ts` and `admin-queries.ts` therefore ship WITHOUT their own `*.test.ts`; their real behavior is verified through (a) the route tests that mock them, (b) `build:verify` type-checking, and (c) the importer smoke test in the final task. Do not stand up a test database.
- **Pre-existing failing tests:** confirm the count at the start of Task 0 (`npx vitest run`) and record it. The per-task gate is: new tests pass AND the total failure count never rises above that recorded baseline.
- Never `npm run build` while `next dev` runs — use `npm run build:verify` (isolated `.next-verify` dir); `npm run db:up` first (builds hit `generateStaticParams` → Postgres).
- `npx tsx -e "<top-level await>"` fails in this repo (CJS); use an async IIFE or a `.mts` file for one-off checks. Script *files* are fine.
- Item routes are keyed by the numeric row **`id`** (`[id]` segment), not slug. The write path keys project/post *upserts* by `slug` (matching the importer), but updates to an existing row target it by `id`.
- `submissions` is **read-only**: `GET` list + `GET` item only. No create/update/delete route, ever. Never surface a writable `company`-like field (the contact honeypot is `referralCode`; `company` is autofilled by Chrome).
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Working-tree hygiene:** untracked `src/services/BaseApiService.ts`, `src/services/interface/IBaseApiService.ts`, and `src/content/posts/pi-hosted-*.md` already exist. Task 1 finishes and commits the two service files. Do NOT commit the `pi-hosted-*.md` posts in this phase. Use explicit pathspecs on every `git add` — never `git add -A`.

## File Structure

New/modified files, by responsibility:

- `src/services/BaseApiService.ts` — **Modify.** Finish per spec: relative `/api/admin` base, constructor-bound endpoint, `ApiError` normalization, `encodeURIComponent` on `delete`, input/output generics.
- `src/services/ApiError.ts` — **New.** Typed `ApiError { status, message }` + `toApiError(unknown)`.
- `src/services/interface/IBaseApiService.ts` — **Modify.** Match the new constructor-bound, endpoint-less signatures.
- `src/services/ProjectService.ts`, `PostService.ts`, `TagService.ts`, `SubmissionService.ts` — **New.** A few lines each, binding endpoint + resource types.
- `src/services/types.ts` — **New.** Shared wire types (`ProjectInput`, `PostInput`, `TagInput`, DTO row shapes) used by services and validators.
- `src/db/admin-queries.ts` — **New.** Admin reads for all four resources (includes drafts).
- `src/db/content-write.ts` — **New.** Shared transaction-wrapped writes: `upsertProjectWithTags`, `deleteProjectById`, `upsertPostWithTags`, `deletePostById`, `upsertTag`, `updateTag`, `deleteTag`.
- `src/lib/apiAuth.ts` — **New.** `requireAdmin()` cookie re-check for defense in depth.
- `src/lib/validateAdmin.ts` — **New.** `validate` helper + per-resource body guards returning `{ ok: true, value } | { ok: false, error }`.
- `src/app/api/admin/projects/route.ts` + `[id]/route.ts` — **New.** `+ *.test.ts`.
- `src/app/api/admin/posts/route.ts` + `[id]/route.ts` — **New.** `+ *.test.ts`.
- `src/app/api/admin/tags/route.ts` + `[id]/route.ts` — **New.** `+ *.test.ts`.
- `src/app/api/admin/submissions/route.ts` + `[id]/route.ts` — **New (read-only).** `+ *.test.ts`.
- `src/db/import-content/run.ts` — **Modify (Task 10).** Converge its per-row project/post upsert+relink onto `content-write.ts`.

---

### Task 0: Baseline

**Files:** none (measurement only).

- [ ] **Step 1: Record the test baseline**

Run: `npm run db:up && npx vitest run 2>&1 | tail -20`
Expected: a summary line like `Tests  N failed | M passed`. **Record N** — this is the failure baseline every later task must not exceed. (Phase 1's plan noted 5 pre-existing failures in `Timeline`/`about`; confirm the current number rather than assuming.)

- [ ] **Step 2: Confirm the working tree**

Run: `git status --short`
Expected: untracked `src/services/` and `src/content/posts/pi-hosted-*.md`, nothing else. If anything else is dirty, stop and surface it.

---

### Task 1: Finish `BaseApiService` + `ApiError`

**Files:**
- Create: `src/services/ApiError.ts`
- Create: `src/services/types.ts`
- Modify: `src/services/BaseApiService.ts`
- Modify: `src/services/interface/IBaseApiService.ts`
- Test: `src/services/BaseApiService.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; message: string }` and `function toApiError(err: unknown): ApiError`.
  - `BaseApiService` with a **constructor-bound endpoint** and `baseURL = "/api/admin"`:
    - `constructor(endpoint: string)`
    - `getAll<T>(): Promise<T[]>`
    - `getById<T>(id: string): Promise<T>`
    - `create<TIn, TOut = TIn>(data: TIn): Promise<TOut>`
    - `update<TIn, TOut = TIn>(id: string, data: TIn): Promise<TOut>`
    - `delete(id: string): Promise<void>`
  - `types.ts`: re-exported DTO types filled in by later tasks; starts with the generic nothing-yet shapes below and grows. (Task 9 uses these.)

- [ ] **Step 1: Write the failing test**

Create `src/services/BaseApiService.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import BaseApiService from "./BaseApiService";
import { ApiError } from "./ApiError";

// Mock axios.create to return a controllable fake client.
const client = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => client),
    isAxiosError: (e: unknown): boolean =>
      typeof e === "object" && e !== null && (e as { isAxiosError?: boolean }).isAxiosError === true,
  },
}));

function axiosError(status: number, errorBody: unknown) {
  return { isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data: errorBody } };
}

describe("BaseApiService", () => {
  afterEach(() => vi.clearAllMocks());

  it("getAll resolves the response data from the bound endpoint", async () => {
    client.get.mockResolvedValue({ data: [{ id: 1 }] });
    const svc = new BaseApiService("projects");
    await expect(svc.getAll()).resolves.toEqual([{ id: 1 }]);
    expect(client.get).toHaveBeenCalledWith("projects");
  });

  it("getById fetches endpoint/id", async () => {
    client.get.mockResolvedValue({ data: { id: 7 } });
    const svc = new BaseApiService("posts");
    await expect(svc.getById("7")).resolves.toEqual({ id: 7 });
    expect(client.get).toHaveBeenCalledWith("posts/7");
  });

  it("update encodes the id", async () => {
    client.put.mockResolvedValue({ data: { ok: true } });
    const svc = new BaseApiService("tags");
    await svc.update("a b/c", { name: "x" });
    expect(client.put).toHaveBeenCalledWith("tags/a%20b%2Fc", { name: "x" });
  });

  it("delete encodes the id (consistency fix)", async () => {
    client.delete.mockResolvedValue({ data: null });
    const svc = new BaseApiService("tags");
    await svc.delete("a b/c");
    expect(client.delete).toHaveBeenCalledWith("tags/a%20b%2Fc");
  });

  it("normalizes a non-2xx response into a typed ApiError with the server message", async () => {
    client.get.mockRejectedValue(axiosError(401, { error: "Unauthorized" }));
    const svc = new BaseApiService("projects");
    await expect(svc.getAll()).rejects.toMatchObject({ status: 401, message: "Unauthorized", name: "ApiError" });
    await expect(svc.getAll()).rejects.toBeInstanceOf(ApiError);
  });

  it("falls back to the axios message when the body has no error field", async () => {
    client.get.mockRejectedValue(axiosError(500, {}));
    const svc = new BaseApiService("projects");
    await expect(svc.getById("1")).rejects.toMatchObject({ status: 500 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/BaseApiService.test.ts`
Expected: FAIL — `ApiError` not found / constructor signature mismatch.

- [ ] **Step 3: Write `ApiError`**

Create `src/services/ApiError.ts`:

```ts
import axios from "axios";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as { error?: string } | undefined;
    return new ApiError(status, data?.error ?? err.message);
  }
  if (err instanceof Error) return new ApiError(0, err.message);
  return new ApiError(0, "Unknown error");
}
```

- [ ] **Step 4: Rewrite `BaseApiService`**

Replace `src/services/BaseApiService.ts` with:

```ts
import axios, { type AxiosInstance } from "axios";
import IBaseApiService from "@/services/interface/IBaseApiService";
import { toApiError } from "@/services/ApiError";

/**
 * Same-origin client for the admin API. The base URL is relative so the
 * httpOnly `admin_session` cookie is sent automatically; the service layer
 * never reads or attaches the token. Each subclass binds one endpoint.
 */
export default class BaseApiService implements IBaseApiService {
  protected readonly api: AxiosInstance = axios.create({
    baseURL: "/api/admin",
    headers: { Accept: "application/json" },
  });

  constructor(protected readonly endpoint: string) {}

  private async run<T>(call: () => Promise<{ data: T }>): Promise<T> {
    try {
      return (await call()).data;
    } catch (err) {
      throw toApiError(err);
    }
  }

  getAll<T>(): Promise<T[]> {
    return this.run<T[]>(() => this.api.get<T[]>(this.endpoint));
  }

  getById<T>(id: string): Promise<T> {
    return this.run<T>(() => this.api.get<T>(`${this.endpoint}/${encodeURIComponent(id)}`));
  }

  create<TIn, TOut = TIn>(data: TIn): Promise<TOut> {
    return this.run<TOut>(() => this.api.post<TOut>(this.endpoint, data));
  }

  update<TIn, TOut = TIn>(id: string, data: TIn): Promise<TOut> {
    return this.run<TOut>(() =>
      this.api.put<TOut>(`${this.endpoint}/${encodeURIComponent(id)}`, data),
    );
  }

  async delete(id: string): Promise<void> {
    await this.run(() => this.api.delete(`${this.endpoint}/${encodeURIComponent(id)}`));
  }
}
```

- [ ] **Step 5: Update the interface**

Replace `src/services/interface/IBaseApiService.ts` with:

```ts
export default interface IBaseApiService {
  getAll<T>(): Promise<T[]>;
  getById<T>(id: string): Promise<T>;
  create<TIn, TOut = TIn>(data: TIn): Promise<TOut>;
  update<TIn, TOut = TIn>(id: string, data: TIn): Promise<TOut>;
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 6: Seed `types.ts`**

Create `src/services/types.ts` (grown in Task 9; start with the row/input shapes the API will exchange):

```ts
// Wire types shared by the admin services and the route validators.
// Rows returned by the API; inputs accepted by create/update.

export type Tech = { name: string; iconUrl: string | null };

export type ProjectInput = {
  slug: string;
  title: string;
  summary: string;
  status: string;
  featured: boolean;
  category: string | null;
  role: string | null;
  dateLabel: string | null;
  sortOrder: number;
  startedAt: string | null;
  completedAt: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  coverImage: string | null;
  content: string | null;
  techDescription: string | null;
  techTabImage: string | null;
  techTabImageAlt: string | null;
  designDescription: string | null;
  designTabImage: string | null;
  designTabImageAlt: string | null;
  tech: Tech[];
};

export type PostInput = {
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  featured: boolean;
  publishedAt: string | null;
  coverImage: string | null;
  content: string | null;
  readingMinutes: number;
  tags: string[];
};

export type TagInput = {
  name: string;
  kind: string;
  iconUrl: string | null;
};
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/services/BaseApiService.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 8: Commit**

```bash
git add src/services/BaseApiService.ts src/services/ApiError.ts src/services/types.ts src/services/interface/IBaseApiService.ts src/services/BaseApiService.test.ts
git commit -m "Finish BaseApiService: relative base, ApiError normalization, encoded ids

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Shared write layer — `src/db/content-write.ts`

**Files:**
- Create: `src/db/content-write.ts`

**Interfaces:**
- Consumes: `db`, schema tables (`projects`, `posts`, `tags`, `projectTags`, `postTags`); the `ProjectInput`/`PostInput`/`TagInput` types from `src/services/types.ts`.
- Produces (all transaction-wrapped so a failed tag relink never leaves a half-linked row):
  - `upsertProjectWithTags(input: ProjectWrite): Promise<ProjectRow>` — `ProjectWrite = ProjectInput & { id?: number }`. If `id` is set, updates that row by id; otherwise inserts/upserts by `slug` (`onConflictDoUpdate`). Then upserts the `tech` tags (`kind: "tech"`), deletes existing `project_tags` for the row, and re-inserts links.
  - `deleteProjectById(id: number): Promise<boolean>` — deletes the row (cascade drops links), then prunes now-orphan tags; returns whether a row was deleted.
  - `upsertPostWithTags(input: PostWrite): Promise<PostRow>` — `PostWrite = PostInput & { id?: number }`; same shape, topic tags (`kind: "topic"`, `iconUrl: null`).
  - `deletePostById(id: number): Promise<boolean>`.
  - `upsertTag(input: TagInput): Promise<TagRow>` — insert by name `onConflictDoUpdate` (kind + icon).
  - `updateTag(id: number, input: TagInput): Promise<TagRow | null>`.
  - `deleteTag(id: number): Promise<boolean>`.
  - Re-exports `type ProjectRow`, `PostRow`, `TagRow` (Drizzle `$inferSelect`).
- This module (per the Global Constraints) ships without its own test; it is verified through the route tests (mocked), `build:verify`, and the Task 10 importer smoke test.

- [ ] **Step 1: Write the module**

Create `src/db/content-write.ts`:

```ts
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
```

- [ ] **Step 2: Type-check the module**

Run: `npx tsc --noEmit`
Expected: no errors. (If `tx.select(...)` inside `notInArray` complains about the subquery type, wrap each subquery in its own `const` — but the importer uses the identical `db.select(...).from(...)` form, so it should type-check.)

- [ ] **Step 3: Commit**

```bash
git add src/db/content-write.ts
git commit -m "Add shared transaction-wrapped admin write layer (projects/posts/tags)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Admin reads — `src/db/admin-queries.ts`

**Files:**
- Create: `src/db/admin-queries.ts`

**Interfaces:**
- Consumes: `db`, schema tables.
- Produces (admin sees ALL statuses, unlike public `queries.ts`):
  - `listProjects(): Promise<ProjectListRow[]>` — ordered newest-first with a stable tiebreak, each with its tags.
  - `getProjectById(id: number): Promise<ProjectDetail | null>` — row + tags.
  - `listPosts()`, `getPostById(id)` — same shape for posts.
  - `listTags(): Promise<TagRow[]>`, `getTagById(id): Promise<TagRow | null>`.
  - `listSubmissions(): Promise<SubmissionRow[]>` (newest-first), `getSubmissionById(id): Promise<SubmissionRow | null>`.
- Ships without its own test (Global Constraints); verified via route tests + build.

- [ ] **Step 1: Write the module**

Create `src/db/admin-queries.ts`:

```ts
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { contactSubmissions, posts, projects, tags } from "./schema";

export type ProjectRow = typeof projects.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type SubmissionRow = typeof contactSubmissions.$inferSelect;

// NULLs sort first on DESC in Postgres; `nulls last` + a stable id tiebreak
// keeps draft/undated rows from floating to the top.
const projectOrder = [
  sql`${projects.startedAt} desc nulls last`,
  desc(projects.sortOrder),
  asc(projects.id),
];

export async function listProjects() {
  return db.query.projects.findMany({
    orderBy: projectOrder,
    with: { projectTags: { with: { tag: true } } },
  });
}

export async function getProjectById(id: number) {
  const row = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { projectTags: { with: { tag: true } } },
  });
  return row ?? null;
}

const postOrder = [sql`${posts.publishedAt} desc nulls last`, asc(posts.id)];

export async function listPosts() {
  return db.query.posts.findMany({
    orderBy: postOrder,
    with: { postTags: { with: { tag: true } } },
  });
}

export async function getPostById(id: number) {
  const row = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: { postTags: { with: { tag: true } } },
  });
  return row ?? null;
}

export async function listTags(): Promise<TagRow[]> {
  return db.query.tags.findMany({ orderBy: [asc(tags.kind), asc(tags.name)] });
}

export async function getTagById(id: number): Promise<TagRow | null> {
  const row = await db.query.tags.findFirst({ where: eq(tags.id, id) });
  return row ?? null;
}

export async function listSubmissions(): Promise<SubmissionRow[]> {
  return db.query.contactSubmissions.findMany({
    orderBy: [desc(contactSubmissions.createdAt), desc(contactSubmissions.id)],
  });
}

export async function getSubmissionById(id: number): Promise<SubmissionRow | null> {
  const row = await db.query.contactSubmissions.findFirst({
    where: eq(contactSubmissions.id, id),
  });
  return row ?? null;
}
```

- [ ] **Step 2: Confirm the relational query names exist**

Run: `grep -n "contactSubmissions\|postsRelations\|projectsRelations" src/db/schema.ts`
Expected: `contactSubmissions` table and `projectsRelations`/`postsRelations` are present. Note: `contact_submissions` has no relations block — the plain `findMany`/`findFirst` above use no `with`, so that is fine. `db.query.contactSubmissions` resolves because the table is exported in the schema object passed to `drizzle(...)`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/db/admin-queries.ts
git commit -m "Add admin read queries (all statuses, separate from public queries)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Route helpers — `requireAdmin` + `validateAdmin`

**Files:**
- Create: `src/lib/apiAuth.ts`
- Create: `src/lib/validateAdmin.ts`
- Test: `src/lib/validateAdmin.test.ts`

**Interfaces:**
- Consumes: `verifySession`, `SESSION_COOKIE` (Phase 1 `src/lib/adminSession.ts`); `next/headers` `cookies()`.
- Produces:
  - `async function requireAdmin(): Promise<boolean>` — reads the `admin_session` cookie via `cookies()` and returns `verifySession(token)`. Used by every route for defense in depth.
  - `src/lib/validateAdmin.ts`:
    - `type Validated<T> = { ok: true; value: T } | { ok: false; error: string }`.
    - `parseProjectInput(body: unknown): Validated<ProjectInput>`
    - `parsePostInput(body: unknown): Validated<PostInput>`
    - `parseTagInput(body: unknown): Validated<TagInput>`
    - `parseId(param: string): number | null` — strict positive-integer parse for `[id]` segments.

- [ ] **Step 1: Write the failing test (validators + id parsing)**

Create `src/lib/validateAdmin.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseId, parseProjectInput, parsePostInput, parseTagInput } from "./validateAdmin";

describe("parseId", () => {
  it("accepts positive integers", () => {
    expect(parseId("7")).toBe(7);
  });
  it("rejects non-numeric, zero, negative, and float ids", () => {
    expect(parseId("abc")).toBeNull();
    expect(parseId("0")).toBeNull();
    expect(parseId("-3")).toBeNull();
    expect(parseId("1.5")).toBeNull();
    expect(parseId("")).toBeNull();
  });
});

describe("parseProjectInput", () => {
  const base = { slug: "demo", title: "Demo", summary: "A demo project" };

  it("accepts a minimal body and fills defaults", () => {
    const r = parseProjectInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.slug).toBe("demo");
      expect(r.value.status).toBe("published");
      expect(r.value.featured).toBe(false);
      expect(r.value.sortOrder).toBe(0);
      expect(r.value.tech).toEqual([]);
      expect(r.value.content).toBeNull();
    }
  });

  it("rejects a missing title", () => {
    const r = parseProjectInput({ slug: "x", summary: "y" });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("title") });
  });

  it("rejects a bad slug", () => {
    const r = parseProjectInput({ ...base, slug: "Bad Slug!" });
    expect(r.ok).toBe(false);
  });

  it("parses the tech array, dropping entries without a name", () => {
    const r = parseProjectInput({ ...base, tech: [{ name: "Next", iconUrl: "/n.svg" }, { iconUrl: "/x" }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.tech).toEqual([{ name: "Next", iconUrl: "/n.svg" }]);
  });

  it("rejects a non-object body", () => {
    expect(parseProjectInput(null).ok).toBe(false);
    expect(parseProjectInput("nope").ok).toBe(false);
  });
});

describe("parsePostInput", () => {
  it("accepts a minimal body and coerces tags to strings", () => {
    const r = parsePostInput({ slug: "p", title: "P", excerpt: "e", tags: ["a", 2, null] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.tags).toEqual(["a"]);
  });
  it("rejects a missing excerpt", () => {
    expect(parsePostInput({ slug: "p", title: "P" }).ok).toBe(false);
  });
});

describe("parseTagInput", () => {
  it("accepts name + kind", () => {
    const r = parseTagInput({ name: "React", kind: "tech", iconUrl: "/r.svg" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.kind).toBe("tech");
  });
  it("rejects an unknown kind", () => {
    expect(parseTagInput({ name: "x", kind: "bogus" }).ok).toBe(false);
  });
  it("rejects a missing name", () => {
    expect(parseTagInput({ kind: "tech" }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/validateAdmin.test.ts`
Expected: FAIL — cannot resolve `./validateAdmin`.

- [ ] **Step 3: Write `apiAuth.ts`**

Create `src/lib/apiAuth.ts`:

```ts
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/adminSession";

/**
 * Defense in depth over the Edge middleware: every /api/admin route re-checks
 * the session so a stray `matcher` edit can never leave a route open.
 */
export async function requireAdmin(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
```

- [ ] **Step 4: Write `validateAdmin.ts`**

Create `src/lib/validateAdmin.ts`:

```ts
import type { ProjectInput, PostInput, TagInput, Tech } from "@/services/types";

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const SLUG_RE = /^[a-z0-9-]+$/;
const TAG_KINDS = new Set(["tech", "topic"]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function reqStr(obj: Record<string, unknown>, field: string): string | { error: string } {
  const v = str(obj[field]);
  return v ?? { error: `Missing or empty "${field}"` };
}

function optStr(obj: Record<string, unknown>, field: string): string | null {
  return str(obj[field]);
}

function optBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function optNum(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function parseId(param: string): number | null {
  if (!/^[1-9][0-9]*$/.test(param)) return null;
  const n = Number(param);
  return Number.isSafeInteger(n) ? n : null;
}

export function parseProjectInput(body: unknown): Validated<ProjectInput> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };

  const title = reqStr(body, "title");
  if (typeof title !== "string") return { ok: false, error: title.error };
  const summary = reqStr(body, "summary");
  if (typeof summary !== "string") return { ok: false, error: summary.error };
  const slug = reqStr(body, "slug");
  if (typeof slug !== "string") return { ok: false, error: slug.error };
  if (!SLUG_RE.test(slug)) return { ok: false, error: `Invalid slug "${slug}" (use a-z 0-9 -)` };

  const tech: Tech[] = Array.isArray(body.tech)
    ? body.tech
        .filter(isObject)
        .map((t) => ({ name: str(t.name), iconUrl: str(t.iconUrl) }))
        .filter((t): t is Tech => t.name !== null)
    : [];

  return {
    ok: true,
    value: {
      slug,
      title,
      summary,
      status: optStr(body, "status") ?? "published",
      featured: optBool(body.featured, false),
      category: optStr(body, "category"),
      role: optStr(body, "role"),
      dateLabel: optStr(body, "dateLabel"),
      sortOrder: optNum(body.sortOrder, 0),
      startedAt: optStr(body, "startedAt"),
      completedAt: optStr(body, "completedAt"),
      liveUrl: optStr(body, "liveUrl"),
      repoUrl: optStr(body, "repoUrl"),
      coverImage: optStr(body, "coverImage"),
      content: optStr(body, "content"),
      techDescription: optStr(body, "techDescription"),
      techTabImage: optStr(body, "techTabImage"),
      techTabImageAlt: optStr(body, "techTabImageAlt"),
      designDescription: optStr(body, "designDescription"),
      designTabImage: optStr(body, "designTabImage"),
      designTabImageAlt: optStr(body, "designTabImageAlt"),
      tech,
    },
  };
}

export function parsePostInput(body: unknown): Validated<PostInput> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };

  const title = reqStr(body, "title");
  if (typeof title !== "string") return { ok: false, error: title.error };
  const excerpt = reqStr(body, "excerpt");
  if (typeof excerpt !== "string") return { ok: false, error: excerpt.error };
  const slug = reqStr(body, "slug");
  if (typeof slug !== "string") return { ok: false, error: slug.error };
  if (!SLUG_RE.test(slug)) return { ok: false, error: `Invalid slug "${slug}" (use a-z 0-9 -)` };

  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.map((t) => str(t)).filter((t): t is string => t !== null)
    : [];

  return {
    ok: true,
    value: {
      slug,
      title,
      excerpt,
      status: optStr(body, "status") ?? "published",
      featured: optBool(body.featured, false),
      publishedAt: optStr(body, "publishedAt"),
      coverImage: optStr(body, "coverImage"),
      content: optStr(body, "content"),
      readingMinutes: optNum(body.readingMinutes, 1),
      tags,
    },
  };
}

export function parseTagInput(body: unknown): Validated<TagInput> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };
  const name = reqStr(body, "name");
  if (typeof name !== "string") return { ok: false, error: name.error };
  const kind = reqStr(body, "kind");
  if (typeof kind !== "string") return { ok: false, error: kind.error };
  if (!TAG_KINDS.has(kind)) return { ok: false, error: `Invalid kind "${kind}" (tech|topic)` };
  return { ok: true, value: { name, kind, iconUrl: optStr(body, "iconUrl") } };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/validateAdmin.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/apiAuth.ts src/lib/validateAdmin.ts src/lib/validateAdmin.test.ts
git commit -m "Add admin route helpers: requireAdmin + per-resource validators

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Projects API routes

**Files:**
- Create: `src/app/api/admin/projects/route.ts`
- Create: `src/app/api/admin/projects/[id]/route.ts`
- Test: `src/app/api/admin/projects/route.test.ts`
- Test: `src/app/api/admin/projects/[id]/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (Task 4); `parseProjectInput`, `parseId` (Task 4); `listProjects`, `getProjectById` (Task 3); `upsertProjectWithTags`, `deleteProjectById` (Task 2).
- Produces:
  - Collection `GET` → `200 ProjectRow[]`; `POST` → `201 ProjectRow` (create/upsert by slug), `400 {error}` on a bad body.
  - Item `GET` → `200 ProjectRow` or `404`; `PUT` → `200 ProjectRow` (by id) or `404` if the id does not exist; `DELETE` → `200 {ok:true}` or `404`. Bad id → `400`.
  - Every method: `401 {error:"Unauthorized"}` when `requireAdmin()` is false.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/admin/projects/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listProjects: vi.fn(),
  upsertProjectWithTags: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ listProjects: mocks.listProjects }));
vi.mock("@/db/content-write", () => ({ upsertProjectWithTags: mocks.upsertProjectWithTags }));

import { GET, POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/admin/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns the project list", async () => {
    mocks.listProjects.mockResolvedValue([{ id: 1, slug: "a" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, slug: "a" }]);
  });

  it("GET is 401 when unauthenticated (defense in depth)", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.listProjects).not.toHaveBeenCalled();
  });

  it("POST creates a project and returns 201", async () => {
    mocks.upsertProjectWithTags.mockResolvedValue({ id: 9, slug: "demo" });
    const res = await POST(post({ slug: "demo", title: "Demo", summary: "s" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 9, slug: "demo" });
    expect(mocks.upsertProjectWithTags).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "demo", title: "Demo", status: "published" }),
    );
  });

  it("POST rejects a bad body with 400 and does not write", async () => {
    const res = await POST(post({ slug: "demo" })); // no title/summary
    expect(res.status).toBe(400);
    expect(mocks.upsertProjectWithTags).not.toHaveBeenCalled();
  });

  it("POST is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    const res = await POST(post({ slug: "demo", title: "D", summary: "s" }));
    expect(res.status).toBe(401);
  });
});
```

Create `src/app/api/admin/projects/[id]/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getProjectById: vi.fn(),
  upsertProjectWithTags: vi.fn(),
  deleteProjectById: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ getProjectById: mocks.getProjectById }));
vi.mock("@/db/content-write", () => ({
  upsertProjectWithTags: mocks.upsertProjectWithTags,
  deleteProjectById: mocks.deleteProjectById,
}));

import { GET, PUT, DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function put(body: unknown): Request {
  return new Request("http://localhost/api/admin/projects/1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns 200 with the row", async () => {
    mocks.getProjectById.mockResolvedValue({ id: 1, slug: "a" });
    const res = await GET(new Request("http://localhost"), ctx("1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1, slug: "a" });
  });

  it("GET returns 404 when missing", async () => {
    mocks.getProjectById.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("GET returns 400 on a bad id", async () => {
    const res = await GET(new Request("http://localhost"), ctx("abc"));
    expect(res.status).toBe(400);
    expect(mocks.getProjectById).not.toHaveBeenCalled();
  });

  it("PUT updates by id and returns 200", async () => {
    mocks.upsertProjectWithTags.mockResolvedValue({ id: 1, slug: "demo" });
    const res = await PUT(put({ slug: "demo", title: "D", summary: "s" }), ctx("1"));
    expect(res.status).toBe(200);
    expect(mocks.upsertProjectWithTags).toHaveBeenCalledWith(expect.objectContaining({ id: 1, slug: "demo" }));
  });

  it("PUT returns 404 when the row does not exist", async () => {
    mocks.upsertProjectWithTags.mockRejectedValue(new Error("Project 1 not found"));
    const res = await PUT(put({ slug: "demo", title: "D", summary: "s" }), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("PUT rejects a bad body with 400", async () => {
    const res = await PUT(put({ slug: "demo" }), ctx("1"));
    expect(res.status).toBe(400);
  });

  it("DELETE returns 200 when a row was removed", async () => {
    mocks.deleteProjectById.mockResolvedValue(true);
    const res = await DELETE(new Request("http://localhost"), ctx("1"));
    expect(res.status).toBe(200);
  });

  it("DELETE returns 404 when nothing was removed", async () => {
    mocks.deleteProjectById.mockResolvedValue(false);
    const res = await DELETE(new Request("http://localhost"), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("every method is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(401);
    expect((await PUT(put({}), ctx("1"))).status).toBe(401);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/api/admin/projects/route.test.ts" "src/app/api/admin/projects/[id]/route.test.ts"`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 3: Write the collection route**

Create `src/app/api/admin/projects/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseProjectInput } from "@/lib/validateAdmin";
import { listProjects } from "@/db/admin-queries";
import { upsertProjectWithTags } from "@/db/content-write";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  return NextResponse.json(await listProjects());
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseProjectInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = await upsertProjectWithTags(parsed.value);
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 4: Write the item route**

Create `src/app/api/admin/projects/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId, parseProjectInput } from "@/lib/validateAdmin";
import { getProjectById } from "@/db/admin-queries";
import { upsertProjectWithTags, deleteProjectById } from "@/db/content-write";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badId = () => NextResponse.json({ error: "Invalid id" }, { status: 400 });

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const row = await getProjectById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseProjectInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const row = await upsertProjectWithTags({ ...parsed.value, id });
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const deleted = await deleteProjectById(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run "src/app/api/admin/projects/route.test.ts" "src/app/api/admin/projects/[id]/route.test.ts"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/admin/projects/route.ts" "src/app/api/admin/projects/route.test.ts" "src/app/api/admin/projects/[id]/route.ts" "src/app/api/admin/projects/[id]/route.test.ts"
git commit -m "Add admin projects API routes (CRUD, auth re-check, validation)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Posts API routes

**Files:**
- Create: `src/app/api/admin/posts/route.ts`
- Create: `src/app/api/admin/posts/[id]/route.ts`
- Test: `src/app/api/admin/posts/route.test.ts`
- Test: `src/app/api/admin/posts/[id]/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`; `parsePostInput`, `parseId`; `listPosts`, `getPostById`; `upsertPostWithTags`, `deletePostById`.
- Produces: the same status contract as Task 5, for posts.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/admin/posts/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listPosts: vi.fn(),
  upsertPostWithTags: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ listPosts: mocks.listPosts }));
vi.mock("@/db/content-write", () => ({ upsertPostWithTags: mocks.upsertPostWithTags }));

import { GET, POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/admin/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns the post list", async () => {
    mocks.listPosts.mockResolvedValue([{ id: 1, slug: "p" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, slug: "p" }]);
  });

  it("POST creates a post and returns 201", async () => {
    mocks.upsertPostWithTags.mockResolvedValue({ id: 3, slug: "p" });
    const res = await POST(post({ slug: "p", title: "P", excerpt: "e" }));
    expect(res.status).toBe(201);
    expect(mocks.upsertPostWithTags).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "p", title: "P", excerpt: "e" }),
    );
  });

  it("POST rejects a bad body with 400", async () => {
    const res = await POST(post({ slug: "p", title: "P" })); // no excerpt
    expect(res.status).toBe(400);
    expect(mocks.upsertPostWithTags).not.toHaveBeenCalled();
  });

  it("GET is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
  });
});
```

Create `src/app/api/admin/posts/[id]/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getPostById: vi.fn(),
  upsertPostWithTags: vi.fn(),
  deletePostById: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ getPostById: mocks.getPostById }));
vi.mock("@/db/content-write", () => ({
  upsertPostWithTags: mocks.upsertPostWithTags,
  deletePostById: mocks.deletePostById,
}));

import { GET, PUT, DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function put(body: unknown): Request {
  return new Request("http://localhost/api/admin/posts/1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/posts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns 200 / 404 / 400", async () => {
    mocks.getPostById.mockResolvedValue({ id: 1 });
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.getPostById.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(404);
    expect((await GET(new Request("http://localhost"), ctx("x"))).status).toBe(400);
  });

  it("PUT updates by id", async () => {
    mocks.upsertPostWithTags.mockResolvedValue({ id: 1, slug: "p" });
    const res = await PUT(put({ slug: "p", title: "P", excerpt: "e" }), ctx("1"));
    expect(res.status).toBe(200);
    expect(mocks.upsertPostWithTags).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("PUT returns 404 when the row is missing", async () => {
    mocks.upsertPostWithTags.mockRejectedValue(new Error("Post 1 not found"));
    const res = await PUT(put({ slug: "p", title: "P", excerpt: "e" }), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("DELETE returns 200 / 404", async () => {
    mocks.deletePostById.mockResolvedValue(true);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.deletePostById.mockResolvedValue(false);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(404);
  });

  it("every method is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(401);
    expect((await PUT(put({}), ctx("1"))).status).toBe(401);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/api/admin/posts/route.test.ts" "src/app/api/admin/posts/[id]/route.test.ts"`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 3: Write the collection route**

Create `src/app/api/admin/posts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parsePostInput } from "@/lib/validateAdmin";
import { listPosts } from "@/db/admin-queries";
import { upsertPostWithTags } from "@/db/content-write";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  return NextResponse.json(await listPosts());
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parsePostInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = await upsertPostWithTags(parsed.value);
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 4: Write the item route**

Create `src/app/api/admin/posts/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId, parsePostInput } from "@/lib/validateAdmin";
import { getPostById } from "@/db/admin-queries";
import { upsertPostWithTags, deletePostById } from "@/db/content-write";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badId = () => NextResponse.json({ error: "Invalid id" }, { status: 400 });

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const row = await getPostById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parsePostInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const row = await upsertPostWithTags({ ...parsed.value, id });
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const deleted = await deletePostById(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run "src/app/api/admin/posts/route.test.ts" "src/app/api/admin/posts/[id]/route.test.ts"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/admin/posts/route.ts" "src/app/api/admin/posts/route.test.ts" "src/app/api/admin/posts/[id]/route.ts" "src/app/api/admin/posts/[id]/route.test.ts"
git commit -m "Add admin posts API routes (CRUD, auth re-check, validation)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Tags API routes

**Files:**
- Create: `src/app/api/admin/tags/route.ts`
- Create: `src/app/api/admin/tags/[id]/route.ts`
- Test: `src/app/api/admin/tags/route.test.ts`
- Test: `src/app/api/admin/tags/[id]/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`; `parseTagInput`, `parseId`; `listTags`, `getTagById`; `upsertTag`, `updateTag`, `deleteTag`.
- Produces: collection `GET` → `200 TagRow[]`, `POST` → `201 TagRow`; item `GET` → `200`/`404`, `PUT` → `200`/`404`, `DELETE` → `200 {ok:true}`/`404`; bad id → `400`; unauthenticated → `401`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/admin/tags/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listTags: vi.fn(),
  upsertTag: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ listTags: mocks.listTags }));
vi.mock("@/db/content-write", () => ({ upsertTag: mocks.upsertTag }));

import { GET, POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/admin/tags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns the tag list", async () => {
    mocks.listTags.mockResolvedValue([{ id: 1, name: "React", kind: "tech" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, name: "React", kind: "tech" }]);
  });

  it("POST creates a tag and returns 201", async () => {
    mocks.upsertTag.mockResolvedValue({ id: 2, name: "Vue", kind: "tech" });
    const res = await POST(post({ name: "Vue", kind: "tech" }));
    expect(res.status).toBe(201);
    expect(mocks.upsertTag).toHaveBeenCalledWith(expect.objectContaining({ name: "Vue", kind: "tech" }));
  });

  it("POST rejects a bad kind with 400", async () => {
    const res = await POST(post({ name: "Vue", kind: "nope" }));
    expect(res.status).toBe(400);
    expect(mocks.upsertTag).not.toHaveBeenCalled();
  });

  it("GET is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
  });
});
```

Create `src/app/api/admin/tags/[id]/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getTagById: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ getTagById: mocks.getTagById }));
vi.mock("@/db/content-write", () => ({ updateTag: mocks.updateTag, deleteTag: mocks.deleteTag }));

import { GET, PUT, DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function put(body: unknown): Request {
  return new Request("http://localhost/api/admin/tags/1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/tags/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns 200 / 404 / 400", async () => {
    mocks.getTagById.mockResolvedValue({ id: 1, name: "React", kind: "tech" });
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.getTagById.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(404);
    expect((await GET(new Request("http://localhost"), ctx("x"))).status).toBe(400);
  });

  it("PUT updates and returns 200, 404 when missing", async () => {
    mocks.updateTag.mockResolvedValue({ id: 1, name: "React", kind: "tech" });
    expect((await PUT(put({ name: "React", kind: "tech" }), ctx("1"))).status).toBe(200);
    mocks.updateTag.mockResolvedValue(null);
    expect((await PUT(put({ name: "React", kind: "tech" }), ctx("1"))).status).toBe(404);
  });

  it("PUT rejects a bad body with 400", async () => {
    expect((await PUT(put({ name: "x", kind: "bogus" }), ctx("1"))).status).toBe(400);
  });

  it("DELETE returns 200 / 404", async () => {
    mocks.deleteTag.mockResolvedValue(true);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.deleteTag.mockResolvedValue(false);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(404);
  });

  it("every method is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost"), ctx("1"))).status).toBe(401);
    expect((await PUT(put({}), ctx("1"))).status).toBe(401);
    expect((await DELETE(new Request("http://localhost"), ctx("1"))).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/api/admin/tags/route.test.ts" "src/app/api/admin/tags/[id]/route.test.ts"`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 3: Write the collection route**

Create `src/app/api/admin/tags/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseTagInput } from "@/lib/validateAdmin";
import { listTags } from "@/db/admin-queries";
import { upsertTag } from "@/db/content-write";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  return NextResponse.json(await listTags());
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseTagInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = await upsertTag(parsed.value);
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 4: Write the item route**

Create `src/app/api/admin/tags/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId, parseTagInput } from "@/lib/validateAdmin";
import { getTagById } from "@/db/admin-queries";
import { updateTag, deleteTag } from "@/db/content-write";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badId = () => NextResponse.json({ error: "Invalid id" }, { status: 400 });

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const row = await getTagById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseTagInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = await updateTag(id, parsed.value);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const deleted = await deleteTag(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run "src/app/api/admin/tags/route.test.ts" "src/app/api/admin/tags/[id]/route.test.ts"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/admin/tags/route.ts" "src/app/api/admin/tags/route.test.ts" "src/app/api/admin/tags/[id]/route.ts" "src/app/api/admin/tags/[id]/route.test.ts"
git commit -m "Add admin tags API routes (CRUD, name/kind validation)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Submissions API routes (read-only)

**Files:**
- Create: `src/app/api/admin/submissions/route.ts`
- Create: `src/app/api/admin/submissions/[id]/route.ts`
- Test: `src/app/api/admin/submissions/route.test.ts`
- Test: `src/app/api/admin/submissions/[id]/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `parseId`; `listSubmissions`, `getSubmissionById`.
- Produces: collection `GET` → `200 SubmissionRow[]`; item `GET` → `200`/`404`; bad id → `400`; unauthenticated → `401`. **No POST/PUT/DELETE exports** — these routes export only `GET`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/admin/submissions/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  listSubmissions: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ listSubmissions: mocks.listSubmissions }));

import * as route from "./route";

describe("/api/admin/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns submissions", async () => {
    mocks.listSubmissions.mockResolvedValue([{ id: 1, email: "a@b.c" }]);
    const res = await route.GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, email: "a@b.c" }]);
  });

  it("GET is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await route.GET()).status).toBe(401);
  });

  it("is read-only: no write verbs exported", () => {
    expect("POST" in route).toBe(false);
    expect("PUT" in route).toBe(false);
    expect("DELETE" in route).toBe(false);
  });
});
```

Create `src/app/api/admin/submissions/[id]/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getSubmissionById: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/db/admin-queries", () => ({ getSubmissionById: mocks.getSubmissionById }));

import * as route from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("/api/admin/submissions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
  });

  it("GET returns 200 / 404 / 400", async () => {
    mocks.getSubmissionById.mockResolvedValue({ id: 1, email: "a@b.c" });
    expect((await route.GET(new Request("http://localhost"), ctx("1"))).status).toBe(200);
    mocks.getSubmissionById.mockResolvedValue(null);
    expect((await route.GET(new Request("http://localhost"), ctx("1"))).status).toBe(404);
    expect((await route.GET(new Request("http://localhost"), ctx("x"))).status).toBe(400);
  });

  it("GET is 401 when unauthenticated", async () => {
    mocks.requireAdmin.mockResolvedValue(false);
    expect((await route.GET(new Request("http://localhost"), ctx("1"))).status).toBe(401);
  });

  it("is read-only: no write verbs exported", () => {
    expect("PUT" in route).toBe(false);
    expect("DELETE" in route).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/api/admin/submissions/route.test.ts" "src/app/api/admin/submissions/[id]/route.test.ts"`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 3: Write the collection route**

Create `src/app/api/admin/submissions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { listSubmissions } from "@/db/admin-queries";

// Read-only by design: contact submissions are never created/edited/deleted
// through the admin. Only GET is exported.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listSubmissions());
}
```

- [ ] **Step 4: Write the item route**

Create `src/app/api/admin/submissions/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId } from "@/lib/validateAdmin";
import { getSubmissionById } from "@/db/admin-queries";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const row = await getSubmissionById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run "src/app/api/admin/submissions/route.test.ts" "src/app/api/admin/submissions/[id]/route.test.ts"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/admin/submissions/route.ts" "src/app/api/admin/submissions/route.test.ts" "src/app/api/admin/submissions/[id]/route.ts" "src/app/api/admin/submissions/[id]/route.test.ts"
git commit -m "Add read-only admin submissions API routes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Per-resource services

**Files:**
- Create: `src/services/ProjectService.ts`
- Create: `src/services/PostService.ts`
- Create: `src/services/TagService.ts`
- Create: `src/services/SubmissionService.ts`
- Modify: `src/services/types.ts` (add row DTOs the services return)
- Test: `src/services/services.test.ts`

**Interfaces:**
- Consumes: `BaseApiService`; the API routes (Tasks 5–8); `ProjectInput`/`PostInput`/`TagInput` (Task 1).
- Produces:
  - `ProjectService` bound to `"projects"`, typed `getAll(): Promise<ProjectRowDTO[]>`, `create(ProjectInput)`, `update(id, ProjectInput)`, `delete(id)`.
  - `PostService` bound to `"posts"`; `TagService` bound to `"tags"`; `SubmissionService` bound to `"submissions"` exposing only `getAll`/`getById` (read-only — no create/update/delete surface).

- [ ] **Step 1: Write the failing test**

Create `src/services/services.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

// Reuse the axios mock approach from BaseApiService.test.
const client = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => client),
    isAxiosError: () => false,
  },
}));

import ProjectService from "./ProjectService";
import PostService from "./PostService";
import TagService from "./TagService";
import SubmissionService from "./SubmissionService";

describe("per-resource services", () => {
  it("ProjectService calls the projects endpoint", async () => {
    client.get.mockResolvedValue({ data: [] });
    await new ProjectService().getAll();
    expect(client.get).toHaveBeenCalledWith("projects");
  });

  it("PostService creates against the posts endpoint", async () => {
    client.post.mockResolvedValue({ data: { id: 1 } });
    await new PostService().create({ slug: "p" } as never);
    expect(client.post).toHaveBeenCalledWith("posts", { slug: "p" });
  });

  it("TagService updates with an encoded id", async () => {
    client.put.mockResolvedValue({ data: { id: 1 } });
    await new TagService().update("1", { name: "x", kind: "tech", iconUrl: null });
    expect(client.put).toHaveBeenCalledWith("tags/1", { name: "x", kind: "tech", iconUrl: null });
  });

  it("SubmissionService exposes only reads", () => {
    const svc = new SubmissionService();
    expect(typeof svc.getAll).toBe("function");
    expect(typeof svc.getById).toBe("function");
    // Read-only service does not expose mutators on its own type surface.
    expect((svc as unknown as { create?: unknown }).create).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/services.test.ts`
Expected: FAIL — cannot resolve the service modules.

- [ ] **Step 3: Extend `types.ts` with row DTOs**

Append to `src/services/types.ts`:

```ts
// Row shapes the API returns (client-side view; dates arrive as ISO strings
// over JSON). Kept loose on timestamps since the client only displays them.
export type TagRowDTO = { id: number; name: string; kind: string; iconUrl: string | null };

export type ProjectRowDTO = ProjectInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type PostRowDTO = PostInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionRowDTO = {
  id: number;
  name: string;
  email: string;
  budget: string | null;
  website: string | null;
  message: string;
  createdAt: string;
  emailedAt: string | null;
  emailError: string | null;
};
```

- [ ] **Step 4: Write the services**

Create `src/services/ProjectService.ts`:

```ts
import BaseApiService from "@/services/BaseApiService";
import type { ProjectInput, ProjectRowDTO } from "@/services/types";

export default class ProjectService extends BaseApiService {
  constructor() {
    super("projects");
  }

  list(): Promise<ProjectRowDTO[]> {
    return this.getAll<ProjectRowDTO>();
  }

  get(id: string): Promise<ProjectRowDTO> {
    return this.getById<ProjectRowDTO>(id);
  }

  save(data: ProjectInput): Promise<ProjectRowDTO> {
    return this.create<ProjectInput, ProjectRowDTO>(data);
  }

  edit(id: string, data: ProjectInput): Promise<ProjectRowDTO> {
    return this.update<ProjectInput, ProjectRowDTO>(id, data);
  }
}
```

Create `src/services/PostService.ts`:

```ts
import BaseApiService from "@/services/BaseApiService";
import type { PostInput, PostRowDTO } from "@/services/types";

export default class PostService extends BaseApiService {
  constructor() {
    super("posts");
  }

  list(): Promise<PostRowDTO[]> {
    return this.getAll<PostRowDTO>();
  }

  get(id: string): Promise<PostRowDTO> {
    return this.getById<PostRowDTO>(id);
  }

  save(data: PostInput): Promise<PostRowDTO> {
    return this.create<PostInput, PostRowDTO>(data);
  }

  edit(id: string, data: PostInput): Promise<PostRowDTO> {
    return this.update<PostInput, PostRowDTO>(id, data);
  }
}
```

Create `src/services/TagService.ts`:

```ts
import BaseApiService from "@/services/BaseApiService";
import type { TagInput, TagRowDTO } from "@/services/types";

export default class TagService extends BaseApiService {
  constructor() {
    super("tags");
  }

  list(): Promise<TagRowDTO[]> {
    return this.getAll<TagRowDTO>();
  }

  save(data: TagInput): Promise<TagRowDTO> {
    return this.create<TagInput, TagRowDTO>(data);
  }

  edit(id: string, data: TagInput): Promise<TagRowDTO> {
    return this.update<TagInput, TagRowDTO>(id, data);
  }
}
```

Create `src/services/SubmissionService.ts` (read-only — exposes only reads):

```ts
import BaseApiService from "@/services/BaseApiService";
import type { SubmissionRowDTO } from "@/services/types";

export default class SubmissionService extends BaseApiService {
  constructor() {
    super("submissions");
  }

  list(): Promise<SubmissionRowDTO[]> {
    return this.getAll<SubmissionRowDTO>();
  }

  get(id: string): Promise<SubmissionRowDTO> {
    return this.getById<SubmissionRowDTO>(id);
  }
}
```

> Note: the `services.test.ts` asserts `getAll`/`getById` exist on `SubmissionService` (inherited) and that `create` is not meaningfully used. Since `create` is inherited from `BaseApiService`, the test's `create` assertion checks the convenience surface, not the base class — adjust the last test to assert `typeof svc.list === "function"` and that no `save`/`edit` convenience methods exist instead:
>
> ```ts
>   it("SubmissionService exposes only read convenience methods", () => {
>     const svc = new SubmissionService();
>     expect(typeof svc.list).toBe("function");
>     expect(typeof svc.get).toBe("function");
>     expect((svc as unknown as { save?: unknown }).save).toBeUndefined();
>     expect((svc as unknown as { edit?: unknown }).edit).toBeUndefined();
>   });
> ```
>
> Apply this correction to the test from Step 1 before running Step 5. Likewise update the other three tests to call `.list()` / `.save()` / `.edit()` (the convenience methods) rather than the base `getAll`/`create`/`update`, e.g. `await new ProjectService().list()` and `await new PostService().save({ slug: "p" } as never)` and `await new TagService().edit("1", { name: "x", kind: "tech", iconUrl: null })`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/services/services.test.ts`
Expected: PASS (4 tests, with the corrected assertions).

- [ ] **Step 6: Commit**

```bash
git add src/services/ProjectService.ts src/services/PostService.ts src/services/TagService.ts src/services/SubmissionService.ts src/services/types.ts src/services/services.test.ts
git commit -m "Add per-resource admin services on BaseApiService

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Converge the importer onto the shared write path

**Files:**
- Modify: `src/db/import-content/run.ts`

**Interfaces:**
- Consumes: `upsertProjectWithTags`, `upsertPostWithTags` (Task 2); the existing `parseProjectRow`/`parsePostRow` output (`ProjectImportRow`/`PostImportRow`).
- Produces: an importer whose per-row project/post write + tag relink is the *same code path* the admin uses, satisfying the spec's "one write path, reused by import and admin." The importer keeps its own file-reading, stale-row pruning, and final logging — only the per-row upsert+relink is delegated.

**Why:** The importer currently re-implements the slug-upsert + tag-relink inline (`run.ts:55-199`). The spec requires admin writes to go through "the same slug-upsert + tag-relink code path the importer uses." Delegating the importer to `content-write.ts` makes that literally one path.

- [ ] **Step 1: Map `ProjectImportRow` → `ProjectWrite`**

`ProjectImportRow` (from `parse.ts`) lacks `role`, `startedAt`, `completedAt`; `ProjectWrite` makes those optional-nullable via `ProjectInput`, which requires them as `string | null`. Add the three missing fields as `null` when adapting. Replace the project write block (`run.ts`, the `db.insert(projects)...` through the `project/tag links` loop, roughly lines 47–134) with:

```ts
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
```

- [ ] **Step 2: Replace the post write block with the shared path**

Replace the posts block (the `db.insert(posts)...` through the `post/tag links` loop) with:

```ts
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
```

- [ ] **Step 3: Update imports and drop now-dead code**

At the top of `run.ts`, add:

```ts
import { upsertProjectWithTags, upsertPostWithTags } from "../content-write";
```

The shared path already upserts tags and prunes orphans per write, so the importer's **standalone top-level tech/topic tag upsert blocks are no longer needed** — remove them. **Keep** the stale-row pruning at the end (`notInArray` deletes of projects/posts whose files are gone) — that is import-only semantics the admin must never run. After those deletes, a final `pruneOrphanTags`-style cleanup is still wanted; keep the existing orphan-tag delete block at the end of `run()` so tags orphaned by a *file removal* are cleaned. Verify the remaining imports (`and`, `eq`, `notInArray`, `sql`) are still all used; remove any that are now unused to keep eslint green.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors, no unused-import warnings.

- [ ] **Step 5: Importer smoke test (idempotency) against the local DB**

> This is the one place the shared write path touches a real database. Running `db:import` is destructive to local dev data — acceptable here; reseed afterward.

```bash
npm run db:up
IMPORT_CONFIRM=1 npm run db:import
IMPORT_CONFIRM=1 npm run db:import   # second run must be stable
npm run db:studio   # (optional) eyeball: project/post/tag counts unchanged between runs
```
Expected: both runs complete without error; the second run's printed counts match the first (idempotent). Then restore a clean dev DB: `npm run db:seed` is NOT a restore of real content — if you need the real content locally, the DB already holds it from the import; leave it. Do not commit any DB state.

- [ ] **Step 6: Commit**

```bash
git add src/db/import-content/run.ts
git commit -m "Converge importer onto the shared content-write path

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Login rate limiting

**Files:**
- Create: `src/lib/rateLimit.ts`
- Test: `src/lib/rateLimit.test.ts`
- Modify: `src/app/api/admin/login/route.ts`
- Modify: `src/app/api/admin/login/route.test.ts`

**Why:** The Phase 1 final whole-branch review flagged login rate-limiting as its top carry-over, to land "before resource routes land." `POST /api/admin/login` is the one unauthenticated admin surface and the brute-force target; everything else is cookie-gated. This adds a best-effort in-memory per-IP limiter with no new dependency.

**Interfaces:**
- Produces:
  - `src/lib/rateLimit.ts`:
    - `function rateLimit(key: string, now?: number): { allowed: boolean; retryAfterSec: number }` — fixed 15-minute window, `MAX_ATTEMPTS = 10` per key. Returns `allowed:false` with the seconds until reset once the count exceeds the max.
    - `function clearRateLimit(key: string): void` — drops a key (called on a successful login so a correct password resets the counter).
    - `function resetRateLimitStore(): void` — clears all keys (tests only).
  - The login route counts each attempt by client IP (`x-forwarded-for` first hop, falling back to a shared `"unknown"` bucket — conservative), returns `429 { error }` with a `Retry-After` header once the limit is exceeded, and clears the key on a successful login.
- Limitation to document in the module header: in-memory and per-process, so it does not share state across serverless instances — a best-effort control, not a distributed limiter.

- [ ] **Step 1: Write the failing test for the limiter**

Create `src/lib/rateLimit.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, clearRateLimit, resetRateLimitStore } from "./rateLimit";

afterEach(() => resetRateLimitStore());

describe("rateLimit", () => {
  it("allows the first 10 attempts and blocks the 11th", () => {
    for (let i = 0; i < 10; i += 1) {
      expect(rateLimit("1.2.3.4").allowed).toBe(true);
    }
    const blocked = rateLimit("1.2.3.4");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    for (let i = 0; i < 11; i += 1) rateLimit("a");
    expect(rateLimit("b").allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    const start = 1_000_000;
    for (let i = 0; i < 11; i += 1) rateLimit("ip", start);
    expect(rateLimit("ip", start).allowed).toBe(false);
    // 15 minutes + 1ms later
    expect(rateLimit("ip", start + 15 * 60 * 1000 + 1).allowed).toBe(true);
  });

  it("clearRateLimit drops a key so a correct login resets the counter", () => {
    for (let i = 0; i < 10; i += 1) rateLimit("ip");
    clearRateLimit("ip");
    expect(rateLimit("ip").allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: FAIL — cannot resolve `./rateLimit`.

- [ ] **Step 3: Write the limiter**

Create `src/lib/rateLimit.ts`:

```ts
// Best-effort in-memory per-key rate limiter. Per-process only: it does NOT
// share state across serverless instances, so it is a brute-force speed bump,
// not a distributed limiter. No external dependency by design.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function rateLimit(key: string, now: number = Date.now()): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export function resetRateLimitStore(): void {
  buckets.clear();
}
```

- [ ] **Step 4: Run the limiter test to verify it passes**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the limiter into the login route**

The current `src/app/api/admin/login/route.ts` (committed in Phase 1) reads env, parses the body, verifies the password, and sets the cookie. Add the rate-limit gate **after** the env check and **before** body parsing, and clear the key on success. The full updated file:

```ts
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/adminPassword";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/adminSession";
import { rateLimit, clearRateLimit } from "@/lib/rateLimit";

function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "unknown";
}

export async function POST(request: Request) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!hash || !secret) {
    return NextResponse.json({ error: "Admin auth is not configured" }, { status: 500 });
  }

  const key = clientKey(request);
  const limit = rateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let password: unknown;
  try {
    const body = await request.json();
    password = (body as { password?: unknown } | null)?.password;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof password !== "string" || !verifyPassword(password, hash)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  clearRateLimit(key);
  const token = await signSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
```

> Preserve the existing status matrix exactly (500 when env unset, 400 on bad JSON, 401 on wrong/non-string password, 200 + cookie on success). The only additions are the 429 gate and the `clearRateLimit` on success.

- [ ] **Step 6: Extend the login route test**

Add to `src/app/api/admin/login/route.test.ts` — import and reset the store so the new test does not bleed into the existing ones, and add a 429 case. At the top, alongside the existing imports:

```ts
import { resetRateLimitStore } from "@/lib/rateLimit";
```

In the existing `beforeEach`, add as the first line:

```ts
    resetRateLimitStore();
```

Add this test inside the `describe` block:

```ts
  it("returns 429 after too many attempts from one IP", async () => {
    function attempt() {
      return POST(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.9" },
          body: JSON.stringify({ password: "nope" }),
        }),
      );
    }
    for (let i = 0; i < 10; i += 1) {
      const res = await attempt();
      expect(res.status).toBe(401);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
```

- [ ] **Step 7: Run the login route tests to verify they pass**

Run: `npx vitest run "src/app/api/admin/login/route.test.ts"`
Expected: PASS — the 4 original tests plus the new 429 test. (The original tests must still pass; `resetRateLimitStore()` in `beforeEach` keeps each isolated.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts "src/app/api/admin/login/route.ts" "src/app/api/admin/login/route.test.ts"
git commit -m "Rate-limit the admin login route (per-IP, in-memory)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Full-suite + build verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run 2>&1 | tail -25`
Expected: all new Phase 2 tests pass; total failures ≤ the baseline recorded in Task 0.

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Production build**

Run (NOT while `next dev` is running): `npm run db:up && npm run build:verify`
Expected: build succeeds; the new `/api/admin/*` route handlers compile. (They import `node`-side Drizzle, so they are Node-runtime route handlers, not Edge — no runtime directive needed; confirm no "edge runtime" warnings for them.)

- [ ] **Step 4: Manual end-to-end smoke (optional but recommended)**

With `.env` carrying dev admin values (from Phase 1), `npm run dev`, log in at `/admin/login`, then exercise the API from the browser console (cookie is sent automatically):

```js
await fetch("/api/admin/projects").then((r) => r.status)        // 200
await fetch("/api/admin/projects/999999").then((r) => r.status) // 404
```
Log out, repeat the first call → `401`. Confirms middleware + per-route `requireAdmin` + the live DB path all agree.

---

## Self-Review

**Spec coverage (Phase 2 section):**
- API routes for `projects`/`posts`/`tags`/`submissions`, collection (`GET`/`POST`) + item (`GET`/`PUT`/`DELETE`) → Tasks 5–8. ✅
- Each handler re-checks auth → `requireAdmin` in every method (Task 4 + used in 5–8). ✅
- Per-resource TS guard + small `validate` helper, no zod → `validateAdmin.ts` (Task 4). ✅
- Project/post writes go through the same slug-upsert + tag-relink code path as the importer, wrapped so a failure never half-links → `content-write.ts` transactions (Task 2), importer converged (Task 10). ✅
- `submissions` read-only, no writable `company`-like field → Task 8 exports only `GET`; no submission write path anywhere. ✅
- `BaseApiService`: relative `/api/admin` base, no `NEXT_PUBLIC_BASE_URL`, no duplicated baseURL, `ApiError` normalization, `delete` encodes id, input/output generics → Task 1. ✅
- Per-resource services extend `BaseApiService`, bind endpoint, few lines each → Task 9. ✅
- `admin-queries.ts` separate from public `queries.ts` → Task 3. ✅ (Spec puts dashboard read fns here in Phase 3; this phase seeds it with the CRUD reads the API needs.)
- Login rate limiting (Phase 1 review carry-over, "before resource routes land") → Task 11. ✅ (Owner-approved addition beyond the spec's written Phase 2 scope.)

**Testing section coverage:** API routes — unauthenticated rejected by the per-route check with middleware mocked out (every route's 401 test); bad bodies → 400; happy-path CRUD exercised against mocked DB fns (repo convention; a real test DB is explicitly out of scope per Global Constraints). `BaseApiService` — non-2xx → typed `ApiError`; both `delete` and `update` encode the id (Task 1). Importer idempotency — Task 10 Step 5 smoke test (manual, since no test-DB harness). The "detail page renders MDX from the content column" and "admin pages" tests belong to Phase 0 (already merged) and Phase 3 respectively. ✅

**Placeholder scan:** No TBD/TODO; every code step shows the code; the one in-test correction (Task 9) is written out in full rather than left as "fix the test." ✅

**Type consistency:** `ProjectInput`/`PostInput`/`TagInput` (Task 1) are consumed unchanged by `validateAdmin` (Task 4), `content-write` (Task 2, via `ProjectWrite = ProjectInput & {id?}`), and the services (Task 9). Route item handlers pass `{ ...parsed.value, id }` matching `ProjectWrite`. `requireAdmin()`/`parseId()`/`parse*Input()` signatures match their call sites in Tasks 5–8. The `Ctx = { params: Promise<{id}> }` shape matches Next 15's async `params`. ✅

**Note for the implementer:** Tasks must run in order — 1 (types) → 2/3/4 (DB + helpers) → 5–8 (routes) → 9 (services) → 10 (importer) → 11 (verify). Task 10 is the only one touching the destructive importer; its smoke test hits the real local DB. Everything else is pure/mocked and safe to run repeatedly.
