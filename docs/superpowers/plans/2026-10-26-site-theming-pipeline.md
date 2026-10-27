# Site Theming Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin build/name/manage colour themes and publish one as the site's active theme, recolouring the whole public site (including the hero particles) via the neon CSS variables; no active theme = today's default.

**Architecture:** A `themes` table with a transactional "at most one active" invariant. The root layout reads the active theme through Next's tagged cache and spreads it as CSS custom properties onto `<html>`'s inline style (beats `globals.css` by cascade, SSG-safe). The hero reads those accent variables at particle init. Admin CRUD mirrors the existing projects/posts/tags stack. Colour only — hero *animation* presets are Phase 2 (separate spec).

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Drizzle ORM + postgres-js, CSS Modules, Vitest + @testing-library/react, `unstable_cache`/`revalidateTag` from `next/cache`.

## Global Constraints

- Styling is **CSS Modules only** — never Tailwind, no `@tailwind`, no `tailwind.config.ts`, no postcss/autoprefixer.
- **No new runtime dependency.** Colour inputs are native `<input type="color">`; icons are hand-written inline SVG.
- Neon default palette (the fallback when no theme is active): `--background #0b0e14`, `--foreground #ffffff`, `--neon-turquoise #00f0ff`, `--neon-pink #ff2e97`, `--neon-purple #b026ff`, `--neon-green #39ff88`.
- Schema changes are `schema.ts` → `npm run db:generate` → commit the generated `drizzle/*.sql` → `npm run db:migrate`. **Never hand-edit `drizzle/`** and never write DDL directly.
- **At most one `themes.isActive = true`** — only ever mutated via `activateTheme`/`deactivateAllThemes` (transactional). The input parser never accepts `isActive` from the client.
- Admin API routes guard with `requireAdmin()` from `@/lib/apiAuth` and the shared `unauthorized()`/`badId()` helpers; bodies parse through `@/lib/validateAdmin`.
- The seed must stay **idempotent** (`onConflictDoUpdate`, not `onConflictDoNothing`).
- Caching: read the active theme via `unstable_cache(fn, ["active-theme"], { tags: ["active-theme"] })`; every mutation that can change the active palette calls `revalidateTag("active-theme")`. Per `AGENTS.md`, confirm these imports against `node_modules/next/dist/docs/` before relying on them (both are exported from `next/cache` in the installed version).
- Tests use `fireEvent` from `@testing-library/react` (project convention) — do NOT add `@testing-library/user-event`. Run with `npx vitest run <path>`.
- **Never run `npm run build` while `next dev` is running** — use `npm run build:verify`, and bring the DB up first with `npm run db:up`.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: `themes` table, types, and migration

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/services/types.ts`
- Create (generated): `drizzle/XXXX_*.sql`

**Interfaces:**
- Produces:
  - Drizzle table `themes` (export `themes`).
  - `export type ThemeInput = { name: string; background: string; foreground: string; turquoise: string; pink: string; purple: string; green: string }`
  - `export type ThemeRowDTO = ThemeInput & { id: number; isActive: boolean }`
  - DB row type `typeof themes.$inferSelect` (carries extra `createdAt`/`updatedAt`; clients ignore them).

- [ ] **Step 1: Add the table to `schema.ts`**

Append to `src/db/schema.ts` (it already imports `pgTable, serial, text, boolean, timestamp` — reuse them):

```ts
export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  background: text("background").notNull().default("#0b0e14"),
  foreground: text("foreground").notNull().default("#ffffff"),
  turquoise: text("turquoise").notNull().default("#00f0ff"),
  pink: text("pink").notNull().default("#ff2e97"),
  purple: text("purple").notNull().default("#b026ff"),
  green: text("green").notNull().default("#39ff88"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Add the types to `types.ts`**

Append to `src/services/types.ts`:

```ts
export type ThemeInput = {
  name: string;
  background: string;
  foreground: string;
  turquoise: string;
  pink: string;
  purple: string;
  green: string;
};

export type ThemeRowDTO = ThemeInput & {
  id: number;
  isActive: boolean;
};
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new `drizzle/XXXX_*.sql` creating the `themes` table with a unique constraint on `name`. Inspect it; do not edit it.

- [ ] **Step 4: Apply the migration and type-check**

Run:
```bash
npm run db:up
npm run db:migrate
npx tsc --noEmit
```
Expected: migration applies cleanly; type-check passes.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/services/types.ts drizzle/
git commit -m "$(cat <<'EOF'
Add themes table and Theme types

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `parseThemeInput` validation

**Files:**
- Modify: `src/lib/validateAdmin.ts`
- Create: `src/lib/validateAdmin.themes.test.ts`

**Interfaces:**
- Consumes: `ThemeInput` (Task 1); existing `Validated<T>`, `isObject`, `reqStr` in `validateAdmin.ts`.
- Produces: `export function parseThemeInput(body: unknown): Validated<ThemeInput>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/validateAdmin.themes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseThemeInput } from "./validateAdmin";

const valid = {
  name: "Sunset",
  background: "#0b0e14",
  foreground: "#ffffff",
  turquoise: "#00f0ff",
  pink: "#ff2e97",
  purple: "#b026ff",
  green: "#39ff88",
};

describe("parseThemeInput", () => {
  it("accepts a valid payload and trims the name", () => {
    const result = parseThemeInput({ ...valid, name: "  Sunset  " });
    expect(result).toEqual({ ok: true, value: { ...valid, name: "Sunset" } });
  });

  it("accepts both #rgb and #rrggbb hex", () => {
    expect(parseThemeInput({ ...valid, turquoise: "#abc" }).ok).toBe(true);
    expect(parseThemeInput({ ...valid, turquoise: "#AABBCC" }).ok).toBe(true);
  });

  it("rejects a non-object body", () => {
    expect(parseThemeInput("nope")).toEqual({ ok: false, error: "Body must be an object" });
  });

  it("rejects an empty name", () => {
    const result = parseThemeInput({ ...valid, name: "   " });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid hex colour with a field-specific message", () => {
    for (const bad of ["red", "#12", "#1234", "00f0ff", "#gggggg"]) {
      const result = parseThemeInput({ ...valid, pink: bad });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/pink/);
    }
  });

  it("rejects a missing colour field", () => {
    const { green, ...withoutGreen } = valid;
    void green;
    expect(parseThemeInput(withoutGreen).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/validateAdmin.themes.test.ts`
Expected: FAIL — `parseThemeInput` is not exported.

- [ ] **Step 3: Implement `parseThemeInput`**

Add to `src/lib/validateAdmin.ts`. First add the import for the type at the top (extend the existing import from `@/services/types`):

```ts
import type { ProjectInput, PostInput, TagInput, Tech, ThemeInput } from "@/services/types";
```

Then append:

```ts
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const THEME_COLORS = [
  "background",
  "foreground",
  "turquoise",
  "pink",
  "purple",
  "green",
] as const;

export function parseThemeInput(body: unknown): Validated<ThemeInput> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };

  const name = reqStr(body, "name");
  if (typeof name !== "string") return { ok: false, error: name.error };

  const colors = {} as Record<(typeof THEME_COLORS)[number], string>;
  for (const field of THEME_COLORS) {
    const value = reqStr(body, field);
    if (typeof value !== "string") return { ok: false, error: value.error };
    if (!HEX_RE.test(value)) {
      return { ok: false, error: `Invalid hex colour for "${field}": "${value}"` };
    }
    colors[field] = value;
  }

  return { ok: true, value: { name, ...colors } };
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/lib/validateAdmin.themes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validateAdmin.ts src/lib/validateAdmin.themes.test.ts
git commit -m "$(cat <<'EOF'
Add parseThemeInput validation (name + six hex colours)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `paletteToStyle` helper

**Files:**
- Create: `src/lib/themeStyle.ts`
- Create: `src/lib/themeStyle.test.ts`

**Interfaces:**
- Consumes: `ThemeRowDTO` (Task 1).
- Produces: `export function paletteToStyle(theme: ThemeRowDTO | null): Record<string, string>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/themeStyle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { paletteToStyle } from "./themeStyle";
import type { ThemeRowDTO } from "@/services/types";

const theme: ThemeRowDTO = {
  id: 1,
  name: "Sunset",
  background: "#101010",
  foreground: "#fafafa",
  turquoise: "#11ccdd",
  pink: "#ee3388",
  purple: "#9922ee",
  green: "#22dd77",
  isActive: true,
};

describe("paletteToStyle", () => {
  it("returns an empty object for the default (null) theme", () => {
    expect(paletteToStyle(null)).toEqual({});
  });

  it("maps a theme to the six :root custom properties", () => {
    expect(paletteToStyle(theme)).toEqual({
      "--background": "#101010",
      "--foreground": "#fafafa",
      "--neon-turquoise": "#11ccdd",
      "--neon-pink": "#ee3388",
      "--neon-purple": "#9922ee",
      "--neon-green": "#22dd77",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/themeStyle.test.ts`
Expected: FAIL — cannot resolve `./themeStyle`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/themeStyle.ts`:

```ts
import type { ThemeRowDTO } from "@/services/types";

/**
 * CSS custom properties for a theme, keyed to match globals.css :root. An empty
 * object for the built-in default (null), so globals.css values apply unchanged.
 * Spread onto the <html> element's inline style, which beats any stylesheet
 * :root rule regardless of load order — no flash, no ordering fragility.
 */
export function paletteToStyle(theme: ThemeRowDTO | null): Record<string, string> {
  if (!theme) return {};
  return {
    "--background": theme.background,
    "--foreground": theme.foreground,
    "--neon-turquoise": theme.turquoise,
    "--neon-pink": theme.pink,
    "--neon-purple": theme.purple,
    "--neon-green": theme.green,
  };
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/lib/themeStyle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/themeStyle.ts src/lib/themeStyle.test.ts
git commit -m "$(cat <<'EOF'
Add paletteToStyle helper mapping a theme to :root custom properties

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: DB read/write layer

**Files:**
- Modify: `src/db/content-write.ts`
- Modify: `src/db/admin-queries.ts`
- Modify: `src/db/queries.ts`

**Interfaces:**
- Consumes: `themes` table (Task 1); `ThemeInput` (Task 1); existing `db`, `eq`, `desc`, `asc`, `sql` imports.
- Produces:
  - `content-write.ts`: `class NameConflictError extends Error`; `upsertTheme(input: ThemeInput, opts?: { id?: number }): Promise<ThemeRow>`; `activateTheme(id: number): Promise<boolean>`; `deactivateAllThemes(): Promise<void>`; `deleteTheme(id: number): Promise<boolean>`. (`ThemeRow = typeof themes.$inferSelect`.)
  - `admin-queries.ts`: `listThemes(): Promise<ThemeRow[]>`; `getTheme(id: number): Promise<ThemeRow | null>`.
  - `queries.ts`: `getActiveTheme(): Promise<ThemeRow | null>` (cached, tag `active-theme`).

This task is DB-integration code; the project has no DB-backed unit-test harness, so it is verified by type-check/build plus a manual psql check of the one-active invariant (Step 4). Do not fabricate unit tests that don't exercise the DB.

- [ ] **Step 1: Write the write-layer functions**

In `src/db/content-write.ts`: ensure `themes` is imported from `./schema` (add it to the existing schema import) and append:

```ts
export class NameConflictError extends Error {
  constructor(message = "name already exists") {
    super(message);
    this.name = "NameConflictError";
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

type ThemeRow = typeof themes.$inferSelect;

export async function upsertTheme(
  input: ThemeInput,
  opts: { id?: number } = {},
): Promise<ThemeRow> {
  const values = {
    name: input.name,
    background: input.background,
    foreground: input.foreground,
    turquoise: input.turquoise,
    pink: input.pink,
    purple: input.purple,
    green: input.green,
  };
  try {
    if (opts.id !== undefined) {
      const [row] = await db
        .update(themes)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(themes.id, opts.id))
        .returning();
      return row;
    }
    const [row] = await db.insert(themes).values(values).returning();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new NameConflictError();
    throw err;
  }
}

export async function activateTheme(id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [exists] = await tx.select({ id: themes.id }).from(themes).where(eq(themes.id, id));
    if (!exists) return false;
    await tx.update(themes).set({ isActive: false }).where(eq(themes.isActive, true));
    await tx.update(themes).set({ isActive: true, updatedAt: new Date() }).where(eq(themes.id, id));
    return true;
  });
}

export async function deactivateAllThemes(): Promise<void> {
  await db.update(themes).set({ isActive: false }).where(eq(themes.isActive, true));
}

export async function deleteTheme(id: number): Promise<boolean> {
  const deleted = await db.delete(themes).where(eq(themes.id, id)).returning({ id: themes.id });
  return deleted.length > 0;
}
```

(If `ThemeRow` is also needed in other files, it stays local here; `admin-queries`/`queries` re-derive it from the table type.)

- [ ] **Step 2: Write the read-layer functions**

In `src/db/admin-queries.ts` (ensure `themes` imported from `./schema`, and `desc`/`asc`/`eq` from `drizzle-orm` are available — they are used elsewhere; add any missing to the import), append:

```ts
type ThemeRow = typeof themes.$inferSelect;

export async function listThemes(): Promise<ThemeRow[]> {
  return db
    .select()
    .from(themes)
    .orderBy(desc(themes.isActive), desc(themes.createdAt), asc(themes.id));
}

export async function getTheme(id: number): Promise<ThemeRow | null> {
  const [row] = await db.select().from(themes).where(eq(themes.id, id));
  return row ?? null;
}
```

In `src/db/queries.ts`, add the cached active-theme read. At the top ensure the import `import { unstable_cache } from "next/cache";` and that `themes` is imported from `./schema`, then append:

```ts
type ThemeRow = typeof themes.$inferSelect;

// Cached + tagged so the static root layout can read the active theme without
// forcing every page dynamic. Mutations call revalidateTag("active-theme").
export const getActiveTheme = unstable_cache(
  async (): Promise<ThemeRow | null> => {
    const [row] = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);
    return row ?? null;
  },
  ["active-theme"],
  { tags: ["active-theme"] },
);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: passes. (If `desc`/`asc`/`unstable_cache`/`themes` are not yet imported in a file, add them; confirm `unstable_cache` is exported from `next/cache` per `AGENTS.md`.)

- [ ] **Step 4: Manual invariant check (DB up)**

Run (DB up via `npm run db:up`), using a scratch script or `npm run db:studio`, exercise:
```
-- via psql or a one-off tsx script importing the functions:
-- insert two themes, activateTheme(a) then activateTheme(b),
-- assert exactly one row has is_active = true (the second), e.g.:
SELECT count(*) FROM themes WHERE is_active = true;   -- expect 1
-- deactivateAllThemes() -> expect 0
```
Expected: exactly one active after each `activateTheme`; zero after `deactivateAllThemes`. Document the result in the task report. (No automated test — the repo has no DB test harness.)

- [ ] **Step 5: Commit**

```bash
git add src/db/content-write.ts src/db/admin-queries.ts src/db/queries.ts
git commit -m "$(cat <<'EOF'
Add theme read/write layer with transactional one-active invariant

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: API routes and `ThemeService`

**Files:**
- Create: `src/app/api/admin/themes/route.ts`
- Create: `src/app/api/admin/themes/[id]/route.ts`
- Create: `src/app/api/admin/themes/[id]/activate/route.ts`
- Create: `src/app/api/admin/themes/active/route.ts`
- Create: `src/services/ThemeService.ts`

**Interfaces:**
- Consumes: `requireAdmin` (`@/lib/apiAuth`); `parseThemeInput`, `parseId` (`@/lib/validateAdmin`); `listThemes`, `getTheme` (`@/db/admin-queries`); `upsertTheme`, `activateTheme`, `deactivateAllThemes`, `deleteTheme`, `NameConflictError` (`@/db/content-write`); `revalidateTag` (`next/cache`); `toApiError` (`@/services/ApiError`); `BaseApiService`; `ThemeInput`, `ThemeRowDTO`.
- Produces: `ThemeService` default export with `list()`, `get(id)`, `save(data)`, `edit(id, data)`, `delete(id)` (inherited), `activate(id): Promise<void>`, `useDefault(): Promise<void>`.

This task is wiring; verified by type-check/build (Step 4) plus the admin-UI tests in Task 6 which drive the service. No standalone route unit tests (matches the repo, whose routes are covered via the admin pages).

- [ ] **Step 1: Collection route**

Create `src/app/api/admin/themes/route.ts`:

```ts
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { parseThemeInput } from "@/lib/validateAdmin";
import { listThemes } from "@/db/admin-queries";
import { NameConflictError, upsertTheme } from "@/db/content-write";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  return NextResponse.json(await listThemes());
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseThemeInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const row = await upsertTheme(parsed.value);
    revalidateTag("active-theme");
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    if (err instanceof NameConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
```

- [ ] **Step 2: Item route**

Create `src/app/api/admin/themes/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId, parseThemeInput } from "@/lib/validateAdmin";
import { getTheme } from "@/db/admin-queries";
import { NameConflictError, deleteTheme, upsertTheme } from "@/db/content-write";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const badId = () => NextResponse.json({ error: "Invalid id" }, { status: 400 });

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const row = await getTheme(id);
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

  const parsed = parseThemeInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const row = await upsertTheme(parsed.value, { id });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Editing the active theme's colours changes the live palette.
    revalidateTag("active-theme");
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof NameConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return unauthorized();
  const id = parseId((await params).id);
  if (id === null) return badId();
  const deleted = await deleteTheme(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Deleting the active theme falls the site back to default.
  revalidateTag("active-theme");
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Activate and use-default routes**

Create `src/app/api/admin/themes/[id]/activate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { parseId } from "@/lib/validateAdmin";
import { activateTheme } from "@/db/content-write";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const ok = await activateTheme(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateTag("active-theme");
  return NextResponse.json({ ok: true });
}
```

Create `src/app/api/admin/themes/active/route.ts`:

```ts
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { deactivateAllThemes } from "@/db/content-write";

export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deactivateAllThemes();
  revalidateTag("active-theme");
  return NextResponse.json({ ok: true });
}
```

Note: Next resolves the static segment `active` and the dynamic `[id]` — a numeric id never collides with the literal `active`, and `parseId("active")` returns null anyway.

- [ ] **Step 4: `ThemeService`**

Create `src/services/ThemeService.ts`:

```ts
import BaseApiService from "@/services/BaseApiService";
import { toApiError } from "@/services/ApiError";
import type { ThemeInput, ThemeRowDTO } from "@/services/types";

export default class ThemeService extends BaseApiService {
  constructor() {
    super("themes");
  }

  list(): Promise<ThemeRowDTO[]> {
    return this.getAll<ThemeRowDTO>();
  }

  get(id: string): Promise<ThemeRowDTO> {
    return this.getById<ThemeRowDTO>(id);
  }

  save(data: ThemeInput): Promise<ThemeRowDTO> {
    return this.create<ThemeInput, ThemeRowDTO>(data);
  }

  edit(id: string, data: ThemeInput): Promise<ThemeRowDTO> {
    return this.update<ThemeInput, ThemeRowDTO>(id, data);
  }

  async activate(id: string): Promise<void> {
    try {
      await this.api.post(`${this.endpoint}/${encodeURIComponent(id)}/activate`);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async useDefault(): Promise<void> {
    try {
      await this.api.delete(`${this.endpoint}/active`);
    } catch (err) {
      throw toApiError(err);
    }
  }
}
```

(`delete(id)` is inherited from `BaseApiService`.)

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/themes src/services/ThemeService.ts
git commit -m "$(cat <<'EOF'
Add themes admin API routes and ThemeService

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Admin "Themes" UI (list, form, pages, sidebar link)

**Files:**
- Create: `src/app/admin/(dashboard)/ThemeForm.tsx`
- Create: `src/app/admin/(dashboard)/ThemeForm.test.tsx`
- Create: `src/app/admin/(dashboard)/themes/page.tsx`
- Create: `src/app/admin/(dashboard)/themes/page.test.tsx`
- Create: `src/app/admin/(dashboard)/themes/new/page.tsx`
- Create: `src/app/admin/(dashboard)/themes/[id]/edit/page.tsx`
- Create: `src/app/admin/(dashboard)/themes/themes.module.css`
- Modify: `src/app/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `ThemeService` (Task 5); `DataTable`, `type Column` (`../DataTable`); `DeleteButton` (`../DeleteButton`); `list.module.css`; `editor.module.css`; `ThemeInput`, `ThemeRowDTO`; `toast`; `useRouter` from `next/navigation`.
- Produces: `ThemeForm` (default export): `function ThemeForm({ initial, submitLabel, onSubmit, submitting }: { initial?: ThemeRowDTO; submitLabel: string; onSubmit: (input: ThemeInput) => void; submitting: boolean })`.

- [ ] **Step 1: Write the `ThemeForm` failing test**

Create `src/app/admin/(dashboard)/ThemeForm.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ThemeForm from "./ThemeForm";

describe("ThemeForm", () => {
  it("renders a name field and all six colour fields", () => {
    render(<ThemeForm submitLabel="Create theme" onSubmit={vi.fn()} submitting={false} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    for (const slot of ["Background", "Foreground", "Turquoise", "Pink", "Purple", "Green"]) {
      expect(screen.getByLabelText(new RegExp(slot, "i"))).toBeInTheDocument();
    }
  });

  it("prefills from an existing theme", () => {
    render(
      <ThemeForm
        submitLabel="Save"
        submitting={false}
        onSubmit={vi.fn()}
        initial={{
          id: 3, name: "Sunset", isActive: false,
          background: "#101010", foreground: "#fafafa", turquoise: "#11ccdd",
          pink: "#ee3388", purple: "#9922ee", green: "#22dd77",
        }}
      />,
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue("Sunset");
  });

  it("submits the entered values", () => {
    const onSubmit = vi.fn();
    render(<ThemeForm submitLabel="Create theme" onSubmit={onSubmit} submitting={false} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Vapor" } });
    fireEvent.submit(screen.getByRole("button", { name: /create theme/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Vapor", background: expect.any(String) }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/ThemeForm.test.tsx"`
Expected: FAIL — cannot resolve `./ThemeForm`.

- [ ] **Step 3: Implement `ThemeForm`**

Create `src/app/admin/(dashboard)/ThemeForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ThemeInput, ThemeRowDTO } from "@/services/types";
import styles from "./editor.module.css";
import fieldStyles from "./FormFields.module.css";
import themeStyles from "./themes/themes.module.css";

const SLOTS: { key: keyof Omit<ThemeInput, "name">; label: string; fallback: string }[] = [
  { key: "background", label: "Background", fallback: "#0b0e14" },
  { key: "foreground", label: "Foreground", fallback: "#ffffff" },
  { key: "turquoise", label: "Turquoise", fallback: "#00f0ff" },
  { key: "pink", label: "Pink", fallback: "#ff2e97" },
  { key: "purple", label: "Purple", fallback: "#b026ff" },
  { key: "green", label: "Green", fallback: "#39ff88" },
];

export default function ThemeForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
}: {
  initial?: ThemeRowDTO;
  submitLabel: string;
  onSubmit: (input: ThemeInput) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [colors, setColors] = useState<Record<string, string>>(() =>
    Object.fromEntries(SLOTS.map((s) => [s.key, initial?.[s.key] ?? s.fallback])),
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      name,
      background: colors.background,
      foreground: colors.foreground,
      turquoise: colors.turquoise,
      pink: colors.pink,
      purple: colors.purple,
      green: colors.green,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={fieldStyles.field}>
        <span className={fieldStyles.label}>Name</span>
        <input
          className={fieldStyles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <div className={themeStyles.slots}>
        {SLOTS.map((slot) => (
          <div key={slot.key} className={themeStyles.slot}>
            <label htmlFor={`color-${slot.key}`}>{slot.label}</label>
            <div className={themeStyles.slotInputs}>
              <input
                id={`color-${slot.key}`}
                type="color"
                aria-label={slot.label}
                value={colors[slot.key]}
                onChange={(e) => setColors((c) => ({ ...c, [slot.key]: e.target.value }))}
              />
              <input
                type="text"
                aria-label={`${slot.label} hex`}
                className={fieldStyles.input}
                value={colors[slot.key]}
                onChange={(e) => setColors((c) => ({ ...c, [slot.key]: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
```

Note on styles: `editor.module.css` provides `.form`, `.actions`, `.primary`, `.heading`; `FormFields.module.css` provides `.field`, `.label`, `.input` (this split matches the other admin forms). The colour-slot layout (`.slots`, `.slot`, `.slotInputs`) comes from `themes.module.css` (next step). Do not restyle the shared modules; add any genuinely new rule to `themes.module.css`.

- [ ] **Step 4: Implement `themes.module.css`**

Create `src/app/admin/(dashboard)/themes/themes.module.css`:

```css
.slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}
.slot {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #aab2c0;
}
.slotInputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.slotInputs input[type="color"] {
  width: 2.5rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.5rem;
  background: #0b0e14;
  cursor: pointer;
}
.swatches {
  display: inline-flex;
  gap: 0.25rem;
}
.swatch {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.activePill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(0, 240, 255, 0.1);
  color: #00f0ff;
  font-size: 0.72rem;
  font-weight: 600;
}
.activateBtn,
.useDefaultBtn {
  font: inherit;
  font-size: 0.82rem;
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 240, 255, 0.3);
  background: transparent;
  color: #00f0ff;
  cursor: pointer;
}
.useDefaultBtn {
  margin-bottom: 1rem;
}
.useDefaultBtn:disabled {
  opacity: 0.4;
  cursor: default;
}
```

- [ ] **Step 5: Write the list page failing test**

Create `src/app/admin/(dashboard)/themes/page.test.tsx`:

```tsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), del: vi.fn(), activate: vi.fn(), useDefault: vi.fn(),
}));
vi.mock("@/services/ThemeService", () => ({
  default: class {
    list = mocks.list; delete = mocks.del; activate = mocks.activate; useDefault = mocks.useDefault;
  },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ThemesListPage from "./page";

const themes = [
  { id: 1, name: "Default Neon", isActive: true, background: "#0b0e14", foreground: "#ffffff",
    turquoise: "#00f0ff", pink: "#ff2e97", purple: "#b026ff", green: "#39ff88" },
  { id: 2, name: "Sunset", isActive: false, background: "#101010", foreground: "#fafafa",
    turquoise: "#11ccdd", pink: "#ee3388", purple: "#9922ee", green: "#22dd77" },
];

describe("ThemesListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue(themes);
  });

  it("renders a row per theme and marks the active one", async () => {
    render(<ThemesListPage />);
    await waitFor(() => expect(screen.getByText("Default Neon")).toBeInTheDocument());
    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.getByText(/^active$/i)).toBeInTheDocument();
  });

  it("activates a theme through the service", async () => {
    mocks.activate.mockResolvedValue(undefined);
    render(<ThemesListPage />);
    await waitFor(() => expect(screen.getByText("Sunset")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /activate sunset/i }));
    await waitFor(() => expect(mocks.activate).toHaveBeenCalledWith("2"));
  });

  it("reverts to default through the service", async () => {
    mocks.useDefault.mockResolvedValue(undefined);
    render(<ThemesListPage />);
    await waitFor(() => expect(screen.getByText("Default Neon")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /use default theme/i }));
    await waitFor(() => expect(mocks.useDefault).toHaveBeenCalled());
  });
});
```

- [ ] **Step 6: Run the list test to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/themes/page.test.tsx"`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 7: Implement the list page**

Create `src/app/admin/(dashboard)/themes/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import ThemeService from "@/services/ThemeService";
import type { ThemeRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DeleteButton from "../DeleteButton";
import DataTable, { type Column } from "../DataTable";
import listStyles from "../list.module.css";
import styles from "./themes.module.css";

const SWATCH_KEYS = ["background", "turquoise", "pink", "purple", "green"] as const;

export default function ThemesListPage() {
  const service = useMemo(() => new ThemeService(), []);
  const [rows, setRows] = useState<ThemeRowDTO[] | null>(null);

  const load = useCallback(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load themes"));
  }, [service]);

  useEffect(() => load(), [load]);

  const activate = useCallback(
    async (id: number, name: string) => {
      try {
        await service.activate(String(id));
        toast.success(`Activated “${name}”`);
        load();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Activate failed");
      }
    },
    [service, load],
  );

  const remove = useCallback(
    async (id: number, name: string) => {
      try {
        await service.delete(String(id));
        toast.success(`Deleted “${name}”`);
        load();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Delete failed");
      }
    },
    [service, load],
  );

  const useDefault = useCallback(async () => {
    try {
      await service.useDefault();
      toast.success("Reverted to the default theme");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to revert");
    }
  }, [service, load]);

  const columns = useMemo<Column<ThemeRowDTO>[]>(
    () => [
      { key: "name", header: "Name", sort: (t) => t.name, cell: (t) => t.name },
      {
        key: "swatches",
        header: "Palette",
        cell: (t) => (
          <span className={styles.swatches}>
            {SWATCH_KEYS.map((k) => (
              <span key={k} className={styles.swatch} style={{ background: t[k] }} title={t[k]} />
            ))}
          </span>
        ),
      },
      {
        key: "active",
        header: "Active",
        sort: (t) => (t.isActive ? 1 : 0),
        cell: (t) =>
          t.isActive ? <span className={styles.activePill}>Active</span> : "",
      },
      {
        key: "actions",
        header: "",
        cellClassName: listStyles.rowActions,
        cell: (t) => (
          <>
            <Link className={listStyles.editLink} href={`/admin/themes/${t.id}/edit`} aria-label={`Edit ${t.name}`}>
              Edit
            </Link>
            {!t.isActive && (
              <button
                type="button"
                className={styles.activateBtn}
                aria-label={`Activate ${t.name}`}
                onClick={() => activate(t.id, t.name)}
              >
                Activate
              </button>
            )}
            <DeleteButton onConfirm={() => remove(t.id, t.name)} />
          </>
        ),
      },
    ],
    [activate, remove],
  );

  const hasActive = rows?.some((t) => t.isActive) ?? false;

  return (
    <div>
      <div className={listStyles.header}>
        <h1 className={listStyles.heading}>Themes</h1>
        <Link className={listStyles.newLink} href="/admin/themes/new">New theme</Link>
      </div>

      <button
        type="button"
        className={styles.useDefaultBtn}
        onClick={useDefault}
        disabled={!hasActive}
      >
        Use default theme
      </button>

      {rows === null ? (
        <p className={listStyles.muted}>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(t) => t.id}
          search={(t) => t.name}
          searchPlaceholder="Search themes…"
          emptyLabel="No themes yet."
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Implement the new/edit pages**

Create `src/app/admin/(dashboard)/themes/new/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ThemeService from "@/services/ThemeService";
import type { ThemeInput } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import ThemeForm from "../../ThemeForm";
import styles from "../../editor.module.css";

export default function NewThemePage() {
  const service = useMemo(() => new ThemeService(), []);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(input: ThemeInput) {
    setSubmitting(true);
    try {
      await service.save(input);
      toast.success("Theme created");
      router.push("/admin/themes");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Create failed");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>New theme</h1>
      <ThemeForm submitLabel="Create theme" onSubmit={onSubmit} submitting={submitting} />
    </div>
  );
}
```

Create `src/app/admin/(dashboard)/themes/[id]/edit/page.tsx`:

```tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ThemeService from "@/services/ThemeService";
import type { ThemeInput, ThemeRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import ThemeForm from "../../../ThemeForm";
import styles from "../../../editor.module.css";

export default function EditThemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = useMemo(() => new ThemeService(), []);
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeRowDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    service
      .get(id)
      .then(setTheme)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load theme"));
  }, [service, id]);

  async function onSubmit(input: ThemeInput) {
    setSubmitting(true);
    try {
      await service.edit(id, input);
      toast.success("Theme saved");
      router.push("/admin/themes");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
      setSubmitting(false);
    }
  }

  if (!theme) return <p className={styles.heading}>Loading…</p>;

  return (
    <div>
      <h1 className={styles.heading}>Edit theme</h1>
      <ThemeForm initial={theme} submitLabel="Save" onSubmit={onSubmit} submitting={submitting} />
    </div>
  );
}
```

- [ ] **Step 9: Add the sidebar link**

In `src/app/admin/AdminSidebar.tsx`, add a `ThemesIcon` (beside the other icon components) and a `LINKS` entry. Icon:

```tsx
const ThemesIcon = () => (
  <svg {...iconProps}><circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="12.5" r="2.5" /><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h1a5 5 0 0 0 5-5 9 9 0 0 0-10-9z" /></svg>
);
```

Add to the `LINKS` array (after Tags, before Submissions):

```tsx
  { href: "/admin/themes", label: "Themes", icon: <ThemesIcon /> },
```

- [ ] **Step 10: Run the admin suite**

Run: `npx vitest run src/app/admin`
Expected: PASS — `ThemeForm.test.tsx` and `themes/page.test.tsx` pass; existing admin tests unaffected. (`AdminSidebar.test.tsx` asserts the fixed link set — if it enumerates exact links, add "Themes" to its expectation.)

- [ ] **Step 11: Commit**

```bash
git add "src/app/admin/(dashboard)/ThemeForm.tsx" "src/app/admin/(dashboard)/ThemeForm.test.tsx" "src/app/admin/(dashboard)/themes" "src/app/admin/AdminSidebar.tsx"
git commit -m "$(cat <<'EOF'
Add admin Themes section: list, form, pages, and sidebar link

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Apply the active theme site-wide (layout + hero + seed)

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/hero/HeroScene.tsx`
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `getActiveTheme` (`@/db/queries`, Task 4); `paletteToStyle` (`@/lib/themeStyle`, Task 3); `themes` table (Task 1).

This task is wiring + a 3D-canvas change; verified by `build:verify` (static generation must survive the layout's cached read), lint, the full test suite, and manual browser verification (jsdom has no CSS cascade or WebGL).

- [ ] **Step 1: Inject the palette in the root layout**

Edit `src/app/layout.tsx`: make `RootLayout` async, read the active theme, and spread it onto `<html>`'s inline style. Add imports:

```tsx
import { getActiveTheme } from "@/db/queries";
import { paletteToStyle } from "@/lib/themeStyle";
```

Change the signature and `<html>` tag:

```tsx
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeTheme = await getActiveTheme();

  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      style={paletteToStyle(activeTheme) as React.CSSProperties}
    >
```

(The rest of the layout is unchanged. The `as React.CSSProperties` cast is needed because `CSSProperties` does not type arbitrary `--*` keys.)

- [ ] **Step 2: Re-tint the hero from the CSS variables**

Edit `src/components/hero/HeroScene.tsx`. Replace the three hardcoded consts with a reader that resolves the active CSS variables at particle init, falling back to the current hex. Remove the `NEON_TURQUOISE/PINK/PURPLE` consts and add:

```ts
function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
```

Inside the existing `useMemo` that builds `palette`, change it to:

```ts
    const palette = [
      new THREE.Color(readVar("--neon-turquoise", "#00F0FF")),
      new THREE.Color(readVar("--neon-pink", "#FF2E97")),
      new THREE.Color(readVar("--neon-purple", "#B026FF")),
    ];
```

Leave everything else (particle count by tier, distribution maths, `useFrame` scroll reads, bloom, DPR) exactly as is. The read happens once at init, never per frame.

- [ ] **Step 3: Seed a sample theme**

In `src/db/seed.ts`, add an idempotent insert of one inactive sample theme (import `themes` from the schema). Use `onConflictDoUpdate` on the unique `name`:

```ts
  await client /* or db */
    .insert(themes)
    .values({
      name: "Sunset",
      background: "#140b0e",
      foreground: "#fff6f0",
      turquoise: "#ffb347",
      pink: "#ff5e7e",
      purple: "#c04cfd",
      green: "#39ff88",
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
      },
    });
```

Match the file's existing db handle and import style (it already imports from `./schema` and uses `sql`); do not change the seed's overall structure, and keep the sample **inactive** so the default look is unchanged after seeding.

- [ ] **Step 4: Run the full suite and lint**

Run: `npx vitest run && npm run lint`
Expected: all pass; lint clean.

- [ ] **Step 5: Production build verification (static generation must survive)**

Run:
```bash
npm run db:up
npm run build:verify
```
Expected: build succeeds and still prerenders the static pages (`○ (Static)` / `● (SSG)` markers for `/`, `/about`, `/contact`, blog/projects detail pages). If the layout's `getActiveTheme()` forced everything to `ƒ (Dynamic)`, the caching is wrong — fix the `unstable_cache` wrapping before proceeding.

- [ ] **Step 6: Manual verification (DB up, `npm run dev`, logged in)**

- Seed/create two themes; activate one → the whole site and the hero particles recolour.
- Reload → persists. Edit the active theme's colours → site updates after the revalidation.
- "Use default theme" → reverts to the original neon look; delete the active theme → also reverts.
- With no theme active, the hero shows its original turquoise/pink/purple.

Document the outcomes in the task report.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/components/hero/HeroScene.tsx src/db/seed.ts
git commit -m "$(cat <<'EOF'
Apply the active theme site-wide via :root vars and re-tint the hero

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Manual verification (after Task 7)

Covered by Task 7 Steps 5–6: static generation survives the cached layout read; activating/editing/deleting/reverting a theme recolours or restores the site and hero as expected.

## Self-Review Notes

- **Spec coverage:** data model + migration (T1); `parseThemeInput` (T2); `paletteToStyle` (T3); write layer with transactional one-active invariant + cached `getActiveTheme` + reads (T4); API routes incl. activate/use-default with `revalidateTag` + `ThemeService` (T5); admin list/form/pages/sidebar (T6); layout injection + hero re-tint + idempotent seed (T7). All spec sections map to a task.
- **Type consistency:** `ThemeInput`/`ThemeRowDTO` (T1) are consumed unchanged in T2/T3/T5/T6; `ThemeRow = typeof themes.$inferSelect` used in T4; `getActiveTheme`/`paletteToStyle` signatures match their call in T7; `ThemeService` methods (`list/get/save/edit/delete/activate/useDefault`) match the T6 list page and T6/T5 usage.
- **Phase boundary:** no `heroPreset` column and no hero motion change — those are Phase 2, keeping the specs separable.
- **Testing reality:** pure logic and components are unit-tested (T2/T3/T6); DB-integration and SSR/WebGL wiring are verified by type-check/`build:verify`/manual, matching the repo's existing (DB-test-free) convention — no vacuous tests stand in for real DB coverage.
- **No placeholders:** every code step carries complete code; every run step an exact command and expected result.
