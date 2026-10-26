# Site theming pipeline (Phase 1 of the theme maker)

**Date:** 2026-10-26
**Status:** Draft, pending approval

## Goal

Let the admin build, name, and manage custom colour themes and publish **one** as
the site's active theme for all visitors. Publishing recolours the whole public
site — including the hero particles — by overriding the neon palette. A theme
with none active falls back to the built-in default (today's look).

This is **Phase 1** of a two-phase feature. Phase 1 is the full theming
pipeline for **colour only**. **Phase 2** (separate spec) adds a hero
*animation-style* preset per theme and the `HeroScene` refactor to switch
motion. Phase 1 deliberately keeps the hero's current single motion and only
re-tints it.

## Non-goals (Phase 1)

- No hero animation/motion changes — the hero keeps its current particle motion,
  only its colours follow the active theme. (Phase 2.)
- No visitor-facing theme switching — one admin-published theme applies to
  everyone; visitors do not pick their own.
- No per-page or scheduled themes, no light/dark modes, no gradients/images —
  a theme is six solid hex colours.
- No new runtime dependency. Colour inputs are native `<input type="color">`.

## Current state

- **Palette** lives as CSS variables in `src/app/globals.css` `:root`:
  `--background #0b0e14`, `--foreground #ffffff`, `--neon-turquoise #00f0ff`,
  `--neon-pink #ff2e97`, `--neon-purple #b026ff`, `--neon-green #39ff88`. The
  whole site reads these via `var(--neon-…)`.
- **Root layout** `src/app/layout.tsx` is a **static** server component; the site
  statically prerenders ~38 pages. It sets font variables on `<html>` and imports
  `globals.css`.
- **Hero** `src/components/hero/HeroScene.tsx` is client-only (`next/dynamic`,
  `ssr:false`) and **hardcodes** its particle colours as module consts
  (`NEON_TURQUOISE/PINK/PURPLE`), separate from the CSS variables.
- **Admin stack** (the pattern to mirror):
  - API routes under `src/app/api/admin/<entity>/route.ts` + `/[id]/route.ts`,
    each guarding with `requireAdmin()` from `@/lib/apiAuth` and returning 401
    via a shared `unauthorized()` helper.
  - Input parsing/validation in `src/lib/validateAdmin.ts` (`parseXInput` →
    `{ ok: true, value } | { ok: false, error }`).
  - Reads in `src/db/admin-queries.ts`; writes in `src/db/content-write.ts`.
  - Client `XService extends BaseApiService` in `src/services/` (`list/get/save/edit/delete`).
  - Admin pages under `src/app/admin/(dashboard)/<entity>/` using the shared
    `DataTable`, `list.module.css`, and `editor.module.css`.
  - Public reads in `src/db/queries.ts`.

## Architecture

### Data model

New Drizzle table `themes` in `src/db/schema.ts`:

| column       | type                        | notes |
|--------------|-----------------------------|-------|
| `id`         | serial pk                   | |
| `name`       | text notNull **unique**     | unique so the seed can upsert and to prevent dup names |
| `background` | text notNull default `#0b0e14` | hex |
| `foreground` | text notNull default `#ffffff` | hex |
| `turquoise`  | text notNull default `#00f0ff` | hex |
| `pink`       | text notNull default `#ff2e97` | hex |
| `purple`     | text notNull default `#b026ff` | hex |
| `green`      | text notNull default `#39ff88` | hex |
| `isActive`   | boolean notNull default false | at most one true |
| `createdAt`  | timestamptz notNull defaultNow | |
| `updatedAt`  | timestamptz notNull defaultNow | |

**"At most one active" invariant** is enforced in the write layer inside a
transaction, never by trusting the client. There is no separate settings table;
the active pointer *is* the single `isActive = true` row (or none → default).

Migration flow (per project rules): edit `schema.ts` → `npm run db:generate`
→ commit the generated `drizzle/*.sql` → `npm run db:migrate`. Never hand-edit
`drizzle/`.

### Types (`src/services/types.ts`)

```ts
export type ThemeInput = {
  name: string;
  background: string; foreground: string;
  turquoise: string; pink: string; purple: string; green: string;
};
export type ThemeRowDTO = ThemeInput & {
  id: number; isActive: boolean;
};
```

### Writes (`src/db/content-write.ts`)

- `upsertTheme(input, { id? }): Promise<ThemeRowDTO>` — insert or update by id;
  reject a duplicate `name` with a `SlugConflictError`-style `NameConflictError`
  (reuse the existing conflict-error convention).
- `activateTheme(id): Promise<void>` — in one transaction: set `isActive=false`
  on all rows, then `isActive=true` on `id`. Throws if `id` doesn't exist.
- `deactivateAllThemes(): Promise<void>` — "use default": set `isActive=false`
  on all rows.
- `deleteTheme(id): Promise<void>` — delete; if it was active, the site falls
  back to default automatically (no active row remains).

### Reads

- `src/db/admin-queries.ts`: `listThemes(): Promise<ThemeRowDTO[]>` (all themes,
  newest first, active flag included) and `getTheme(id)`.
- `src/db/queries.ts`: `getActiveTheme(): Promise<ThemeRowDTO | null>` — the one
  active theme or null. **Wrapped in Next's `unstable_cache`** with key
  `['active-theme']` and tag `['active-theme']` so the static layout can read it
  without forcing every page dynamic. Invalidated by `revalidateTag('active-theme')`.

### Applying the palette site-wide (no FOUC, SSG-safe)

A pure helper in `src/lib/themeStyle.ts`:

```ts
import type { ThemeRowDTO } from "@/services/types";
/** CSS custom properties for a theme, or {} for the built-in default. */
export function paletteToStyle(theme: ThemeRowDTO | null): Record<string, string>;
```

It returns an object of the six custom properties
(`"--background"`, `"--foreground"`, `"--neon-turquoise"`, `"--neon-pink"`,
`"--neon-purple"`, `"--neon-green"`) → the theme's hex values, or `{}` when
`theme` is null.

The **root layout becomes `async`**, calls `getActiveTheme()`, and spreads the
result onto the `<html>` element's inline `style`:

```tsx
const theme = await getActiveTheme();
return (
  <html lang="en" className={…} style={paletteToStyle(theme)}>
```

**Why inline style on `<html>` rather than a `<style>` tag:** inline custom
properties on the `:root` element beat any stylesheet `:root` rule regardless of
load order, so the active palette reliably overrides `globals.css` with no
ordering fragility and no flash. When no theme is active, the style object is
empty and `globals.css` defaults apply unchanged. Because `getActiveTheme()` is
cached+tagged, pages still prerender; publishing revalidates the tag.

### Hero re-tint (`src/components/hero/HeroScene.tsx`)

Replace the three hardcoded consts with values read from the resolved CSS
variables at particle-field init, falling back to the current hex if a variable
is empty:

```ts
function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
// inside the existing useMemo that builds the palette:
const palette = [
  new THREE.Color(readVar("--neon-turquoise", "#00F0FF")),
  new THREE.Color(readVar("--neon-pink", "#FF2E97")),
  new THREE.Color(readVar("--neon-purple", "#B026FF")),
];
```

The hero is client-only, so reading computed styles on mount is safe (no SSR
mismatch), and by mount the active palette is already on `<html>`. **Everything
else in the hero is untouched**: device-tier particle budgets (2500/800), bloom
on `full`, DPR cap, the scroll-store `useFrame` reads, `matchMedia` pin — all
preserved. Motion is unchanged (Phase 2).

### Admin "Themes" section

- `ThemeService extends BaseApiService("themes")` with `list/get/save/edit/delete`
  plus `activate(id)` and `useDefault()` (POST to the activate endpoint).
- API: `src/app/api/admin/themes/route.ts` (GET list, POST create) and
  `/[id]/route.ts` (GET, PUT, DELETE), all `requireAdmin()`-guarded, bodies
  parsed by `parseThemeInput`. A dedicated **activate** endpoint
  `src/app/api/admin/themes/[id]/activate/route.ts` (POST) calls `activateTheme`
  then `revalidateTag('active-theme')`; a `src/app/api/admin/themes/active/route.ts`
  (DELETE) calls `deactivateAllThemes()` + revalidates ("use default"). Edits to
  an existing theme also `revalidateTag('active-theme')` (cheap; only matters
  when the edited theme is the active one).
- Validation `parseThemeInput` in `src/lib/validateAdmin.ts`: `name` a non-empty
  trimmed string; each of the six colours matching `/^#([0-9a-f]{3}|[0-9a-f]{6})$/i`.
  Returns the same `{ ok, value } | { ok, error }` shape as the others.
- Admin pages under `src/app/admin/(dashboard)/themes/`:
  - **List** (`page.tsx`): the shared `DataTable` with columns Name, a swatch
    strip (six small colour chips), Active (a turquoise "Active" pill on the
    active row), and row actions Edit / Activate / Delete. A **"Use default
    theme"** button above the table (disabled when none is active) calls
    `useDefault()`. Uses `list.module.css` + a small `themes.module.css` for the
    swatches.
  - **Editor** (`themes/new/page.tsx`, `themes/[id]/edit/page.tsx` + a shared
    `ThemeForm.tsx`): name field + six colour rows, each a native
    `<input type="color">` bound to a hex `<input type="text">` (two-way: the
    picker sets the hex, a valid hex updates the picker). Save → `save`/`edit`.
    `editor.module.css` for layout.
- Add a **"Themes"** link to `AdminSidebar` `LINKS` (new inline SVG icon, same
  convention) and a dashboard quick-link.

### Seed

`src/db/seed.ts` inserts one sample theme (inactive), idempotent via
`onConflictDoUpdate` on the unique `name` (per the project's idempotent-seed
rule). The default look needs no row — null-active is the default.

## Data flow

1. Admin creates/edits a theme (colour pickers) → `ThemeService.save/edit` →
   API → `upsertTheme`.
2. Admin clicks **Activate** → `activate(id)` → API → `activateTheme` (txn,
   one-active invariant) → `revalidateTag('active-theme')`.
3. Next request: root layout's cached `getActiveTheme()` returns the active row →
   `paletteToStyle` → custom props on `<html>` → whole site + hero recolour.
4. **Use default** → `deactivateAllThemes` → revalidate → `<html>` gets no
   overrides → `globals.css` defaults.

## Error handling

- API routes: 401 unauthenticated; 400 invalid JSON / failed `parseThemeInput`
  (with the field-level message); 409 on duplicate `name`; 404 activating/
  editing a missing id.
- Service/UI: `toast.error` on `ApiError` (existing convention); the list and
  form surface failures the way projects/posts do.
- A colour that somehow reaches the DB malformed cannot break the layout —
  `paletteToStyle` passes strings straight through to inline style; an invalid
  value is simply ignored by the browser (that slot falls back to the cascade).
  Validation at the API boundary is the real guard.

## Testing

Unit (vitest):
- `themeStyle.test.ts` — `paletteToStyle(theme)` returns the six custom props for
  a theme; returns `{}` for `null`.
- `validateAdmin` theme cases — `parseThemeInput` accepts a valid payload,
  rejects empty name, rejects a bad hex (`"red"`, `"#12"`, `"#1234"`), accepts
  both `#abc` and `#aabbcc`.
- `ThemeForm.test.tsx` — renders the six colour fields + name; typing a hex
  updates the bound control; Save calls the service with the entered values
  (service mocked, per the existing form tests).
- `themes/page.test.tsx` — list renders a row per theme with swatches and marks
  the active one; Activate calls the service; "Use default" calls `useDefault`
  (service mocked).

Not unit-tested (no DB-backed test harness exists; verified manually):
- the one-active transaction invariant in `activateTheme`,
- the layout's cached read + `<html>` injection and the hero reading CSS vars
  (jsdom has no cascade/computed custom properties and no WebGL).

Manual verification (DB up, `npm run dev`, logged in): create two themes;
activate one → the whole site and the hero particles recolour; reload → persists;
edit the active theme's colours → site updates after revalidation; "Use default"
→ reverts to the original neon look; delete the active theme → also reverts.
Confirm `npm run build:verify` still prerenders the static pages (the cached
active-theme read must not force them dynamic).

## Files

**New:**
- `src/lib/themeStyle.ts` (+ `themeStyle.test.ts`)
- `src/app/api/admin/themes/route.ts`, `/[id]/route.ts`,
  `/[id]/activate/route.ts`, `/active/route.ts`
- `src/services/ThemeService.ts`
- `src/app/admin/(dashboard)/themes/page.tsx` (+ `page.test.tsx`),
  `themes/new/page.tsx`, `themes/[id]/edit/page.tsx`,
  `ThemeForm.tsx` (+ `ThemeForm.test.tsx`), `themes/themes.module.css`
- Drizzle migration under `drizzle/` (generated)

**Changed:**
- `src/db/schema.ts` (themes table) — then `db:generate`/`db:migrate`
- `src/db/content-write.ts` (upsert/activate/deactivate/delete + NameConflictError)
- `src/db/admin-queries.ts` (`listThemes`, `getTheme`)
- `src/db/queries.ts` (`getActiveTheme`, cached+tagged)
- `src/lib/validateAdmin.ts` (`parseThemeInput`)
- `src/services/types.ts` (`ThemeInput`, `ThemeRowDTO`)
- `src/app/layout.tsx` (async; inject `paletteToStyle` onto `<html>`)
- `src/components/hero/HeroScene.tsx` (read accent CSS vars with fallback)
- `src/app/admin/AdminSidebar.tsx` (Themes link + icon)
- `src/db/seed.ts` (one sample inactive theme)

## Risks / watch-items

- **Static generation:** the layout's `getActiveTheme()` MUST be cached with a
  tag (`unstable_cache` + `revalidateTag('active-theme')` on publish), or it
  forces all ~38 pages dynamic. `build:verify` after wiring confirms they still
  prerender.
- **Caching API is version-sensitive:** per `AGENTS.md`, this Next version may
  differ from training data. Before implementing, confirm the exact cache
  primitive and its import against `node_modules/next/dist/docs/` (e.g.
  `unstable_cache` vs a `"use cache"` directive) rather than assuming — the
  tag-based `revalidateTag('active-theme')` contract stays the same either way.
- **One-active invariant:** only ever mutate `isActive` through `activateTheme`/
  `deactivateAllThemes` (transactional). Never let the client set `isActive`
  directly through `upsertTheme` (the parser omits it).
- **Hero var read timing:** read inside the existing `useMemo` at field init,
  not per frame (a per-frame `getComputedStyle` would wreck performance and
  violates the hero's imperative-read rule).
- **Phase 2 seam:** the `themes` table gets its `heroPreset` column and the
  `HeroScene` motion refactor in Phase 2; Phase 1 neither adds the column nor
  changes motion, so the two specs stay cleanly separable.
