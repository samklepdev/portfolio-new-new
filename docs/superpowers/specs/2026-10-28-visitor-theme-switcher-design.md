# Visitor theme switcher — palette (theming Phase 3, Spec A)

**Date:** 2026-10-28
**Status:** Draft, pending approval

## Goal

Let a site visitor choose among a curated set of themes from the front end and
have their choice recolour the whole site and stick across pages and visits —
while the admin still controls which themes exist and which one is the default.
Ships three designed themes (**CyberPunk**, **Ember**, **Synthwave**), a
front-end switcher in the header, and the delivery plumbing that applies a
saved choice before first paint without breaking static generation.

This is **Phase 3, Spec A** of the theming pipeline. Phase 1 (PR #38) gave the
admin a single server-rendered active theme; Phase 2 (PR #39) added a per-theme
hero animation preset. **Spec B** (separate, the "last phase") makes an
*in-session* switch update the already-mounted hero live. Spec A delivers the
switcher and whole-site recolour, and — because the saved theme is applied
before the hero mounts — a returning visitor already gets the correct hero
colour *and* motion at load. The only thing Spec A leaves to Spec B is live
in-session hero reactivity.

**Depends on Phase 2 (PR #39) being merged.** Spec A builds on `themeToStyle`,
the `hero_preset` column (migration `0007`), and the Phase-2 `ThemeForm`/seed.
Implement on a branch from `main` taken *after* #39 merges; the new migration
is `0008`.

## Non-goals

- **No change to how `/` is generated.** The root layout must stay statically
  generated — it must not read cookies, headers, or `searchParams`. The
  visitor's choice is applied client-side, never server-rendered per visitor.
- **No live update of the already-mounted hero on an in-session switch** — that
  is Spec B. Spec A does not modify any hero component.
- **No visitor accounts / server-side persistence.** The choice lives in the
  visitor's `localStorage` only.
- **No new public API route.** The public themes are embedded in the server-
  rendered HTML (and passed to the switcher as props); the switcher never
  fetches.
- No change to the admin one-active invariant, the `activate` endpoint, or the
  `revalidateTag("active-theme")` wiring.

## Current state

- **Root layout** `src/app/layout.tsx` — `async` server component; reads
  `getActiveTheme()` and renders `<html style={themeToStyle(activeTheme)}>`,
  then `<body>{children}…</body>`. Statically generated.
- **Site layout** `src/app/(site)/layout.tsx` — a **synchronous server
  component** returning `<><Header /> {children} <Footer /></>`.
- **Header** `src/components/header/Header.tsx` — `"use client"`; takes no
  props; on `/` it reveals after the hero (`heroDismissed` from the scroll
  store), present from first paint elsewhere.
- **Theme → CSS** `src/lib/themeStyle.ts` — `themeToStyle(theme | null)`
  returns `{}` for null, else the six `--*` colour vars + `--hero-preset`.
- **Reads** `src/db/queries.ts` — `getActiveTheme` is
  `unstable_cache(async () => …, ["active-theme"], { tags: ["active-theme"] })`
  returning `ThemeRow | null` (`type ThemeRow = typeof themes.$inferSelect`).
- **Validation** `src/lib/validateAdmin.ts` — `parseThemeInput` requires `name`
  + six hex colours, resolves `heroPreset` (default `orbit`, reject unknown),
  never reads `isActive`. An `optBool(v, fallback)` helper already exists
  (used for `featured`).
- **Write** `src/db/content-write.ts` — `upsertTheme(input, {id?})` maps the
  `ThemeInput` fields into insert/update values.
- **Types** `src/services/types.ts` — `ThemeInput` (name, six colours,
  `heroPreset?`); `ThemeRowDTO = ThemeInput & { id; isActive }`.
- **Admin form** `src/app/admin/(dashboard)/ThemeForm.tsx` — name + a `SLOTS`
  grid of six colour inputs labelled `Background/Foreground/Turquoise/Pink/
  Purple/Green` + a "Hero animation" radio fieldset.
- **List** `src/app/admin/(dashboard)/themes/page.tsx` — DataTable (Name,
  Palette swatches, Animation, Status, actions).
- **Seed** `src/db/seed.ts` — one inactive sample theme "Sunset".
- **Mutations** — the themes POST/PUT/DELETE/activate routes each call
  `revalidateTag("active-theme")`.

## The three themes

All dark-based (keeps the neon identity and is safe behind the WebGL hero), each
with a distinct dominant hue and its own hero preset. **Status stays green in
all three** — it carries the site-wide "available for work" meaning and must not
shift per theme.

| Role (column / CSS var) | CyberPunk | Ember | Synthwave |
|---|---|---|---|
| Background (`background` / `--background`) | `#0b0e14` | `#140b0a` | `#120a1e` |
| Foreground (`foreground` / `--foreground`) | `#ffffff` | `#fff4ec` | `#f6f0ff` |
| Primary (`turquoise` / `--neon-turquoise`) | `#00f0ff` | `#ff7a18` | `#c05cff` |
| Secondary (`pink` / `--neon-pink`) | `#ff2e97` | `#ff2e63` | `#ff5bd1` |
| Accent (`purple` / `--neon-purple`) | `#b026ff` | `#b5179e` | `#3ab0ff` |
| Status (`green` / `--neon-green`) | `#39ff88` | `#4ade80` | `#35e07f` |
| `heroPreset` | `orbit` | `pulse` | `wave` |
| `isActive` / `isPublic` | `true` / `true` | `false` / `true` | `false` / `true` |

CyberPunk's palette equals today's `globals.css :root`, so seeding it active
produces no visual change — the vars are just set explicitly on `<html>` instead
of falling through to `:root`.

## Architecture

### 1. Data model & seed
- Add `isPublic` to the `themes` table: `boolean("is_public").notNull().default(false)`.
  `db:generate` → migration `0008` → `db:migrate`.
- `isPublic` is an **editable** flag (unlike `isActive`, which is set only by the
  activate endpoint): add `isPublic?: boolean` to `ThemeInput`; `parseThemeInput`
  resolves it with `optBool(body.isPublic, false)`; `upsertTheme` persists it.
  (`ThemeRowDTO` inherits it via `ThemeInput`.)
- Rework `src/db/seed.ts` to bootstrap the three themes above, idempotent via
  `onConflictDoUpdate` on `name` (each `set` includes `is_public`,
  `hero_preset`, and the colours). The seed sets CyberPunk active; it does **not**
  deactivate others by hand (it relies on CyberPunk being the only `isActive:true`
  row it inserts — acceptable for a dev bootstrap). The old "Sunset" block is
  removed from the seed (not deleted from existing DBs).

### 2. Read: public themes
`src/db/queries.ts` gains:
```ts
export const getPublicThemes = unstable_cache(
  async (): Promise<ThemeRow[]> =>
    db.select().from(themes).where(eq(themes.isPublic, true))
      .orderBy(desc(themes.isActive), asc(themes.id)),
  ["public-themes"],
  { tags: ["active-theme"] },
);
```
It shares the existing `"active-theme"` cache tag, so every theme mutation
(which already calls `revalidateTag("active-theme")`) busts it too — **no route
changes needed**. Active-first, then id order, so the default sorts first.

### 3. Delivery (keeps `/` static)
The root layout renders the active theme into `<html style>` exactly as today,
then emits two document-level things built from `getPublicThemes()`:

1. **An embedded JSON blob** — `<script id="__themes__" type="application/json">`
   containing, for each public theme, `{ id, name, isActive, style }` where
   `style = themeToStyle(theme)` (the precomputed `--*` var map). Same for every
   visitor, so it is fully static.
2. **A blocking pre-hydration inline script** (`<script dangerouslySetInnerHTML>`
   placed at the very start of `<body>`, before `{children}`) that: reads the
   saved theme id from `localStorage[THEME_STORAGE_KEY]`; parses the `__themes__`
   JSON; if the saved id matches a public theme, writes each `style` entry onto
   `document.documentElement` with `setProperty` — **before first paint**, so no
   flash. Unknown/absent/stale id → does nothing (the SSR active default stands).
   The script text is produced by a pure, testable builder in
   `src/lib/themeBoot.ts` (so it is not a magic string in JSX).

Because this runs before the `ssr:false` hero mounts, a returning visitor's hero
reads the correct `--neon-*` and `--hero-preset` at init — correct colour *and*
motion at load, with no hero code change.

### 4. The switcher
- `src/app/(site)/layout.tsx` becomes `async`, reads `getPublicThemes()`, maps
  each row to a lean, serialisable `PublicTheme` (`{ id, name, isActive, style }`
  — the same shape as the JSON blob; no `Date` fields cross the boundary), and
  passes the array to `<Header publicThemes={…} />`.
- `Header` gains a `publicThemes: PublicTheme[]` prop and renders
  `<ThemeSwitcher themes={publicThemes} />` in its action area.
- `src/components/theme/ThemeSwitcher.tsx` (`"use client"`) — a palette-icon
  button opening a popover listing each theme by name + a swatch (built from its
  `style` map). Picking a theme: applies its `style` to
  `document.documentElement` (via the shared `applyThemeStyle` helper), writes
  its id to `localStorage`, and updates the highlighted selection.
  - **Hydration safety:** initial render highlights the active theme
    (`themes.find(t => t.isActive) ?? themes[0]`) to match server markup; a
    mount effect then reconciles the highlight to the saved `localStorage` id.
    The *visual* theme is already correct pre-paint (inline script), so this
    only moves the checkmark, with no layout shift.
  - A saved id no longer in `themes` falls back to the active default.
- `src/lib/themeApply.ts` — pure helpers shared by the switcher (and unit-
  tested): `THEME_STORAGE_KEY`, `applyThemeStyle(el, style)` (sets each
  `--*` property), `readStoredThemeId()` / `storeThemeId(id)`.

### 5. Admin surface (labels only + the flag)
- **Semantic relabel (labels only, no column/var/migration change):** in
  `ThemeForm`'s `SLOTS`, the four accent labels become
  `Primary / Secondary / Accent / Status` (keys `turquoise/pink/purple/green`
  unchanged); `Background`/`Foreground` keep their names. The themes-list swatch
  `title`s follow suit if they currently name hues.
- **"Show on site" toggle** in `ThemeForm` — a checkbox bound to `isPublic`,
  included in the `onSubmit` payload (so it flows through `parseThemeInput` →
  `upsertTheme`).
- **"Public" column** in the themes list showing Yes/No (`sort` + `cell` on
  `isPublic`).

## Data flow

1. Admin edits a theme / toggles "Show on site" → PUT → `parseThemeInput`
   (`optBool`) → `upsertTheme` persists `is_public` → `revalidateTag("active-theme")`
   busts both `getActiveTheme` and `getPublicThemes`.
2. Root layout (static) renders active theme into `<html style>` + embeds the
   public-themes JSON + the pre-hydration inline script.
3. First paint: inline script applies the visitor's saved public theme (if any)
   onto `<html>` before the page paints and before the hero mounts.
4. `(site)` layout passes public themes to `Header` → `ThemeSwitcher`.
5. Visitor picks a theme → `applyThemeStyle` sets `--*` on `<html>` (whole site
   recolours instantly) → `storeThemeId` persists it. The already-mounted hero
   is unchanged until the next load (Spec B closes this).

## Error handling

- Saved id absent / unparseable / not a current public theme → no override; the
  active default stands. The inline script wraps its body in `try/catch` so a
  storage exception (e.g. disabled storage) can never block paint.
- `getPublicThemes` returning an empty set → the switcher renders nothing (no
  button); the site shows the active default. (With the seed, at least CyberPunk
  is public.)
- `isPublic` is validated as a real boolean (`optBool`), so a non-boolean body
  value defaults to `false` rather than throwing.

## Testing

jsdom has no paint/WebGL, so visuals are verified by loading the page; unit
tests cover pure logic and wiring. (`localStorage` is already polyfilled in
`vitest.setup.ts`.)

- **`src/lib/themeApply.test.ts`** — `applyThemeStyle` sets every `--*` property
  on a given element; `storeThemeId`/`readStoredThemeId` round-trip and
  `readStoredThemeId` returns null on absent/garbage.
- **`src/lib/themeBoot.test.ts`** — the inline-script builder emits a script that,
  when evaluated against a stub `document`/`localStorage` + an embedded JSON set,
  applies the saved theme's vars and no-ops on an unknown id (run the emitted
  string via `new Function`).
- **`src/lib/validateAdmin.test.ts`** — `parseThemeInput` accepts `isPublic:true`,
  defaults absent → `false`, coerces a non-boolean → `false`.
- **`src/components/theme/ThemeSwitcher.test.tsx`** — renders a button per public
  theme (or a single opener listing them); clicking a theme calls the apply
  helper with that theme's style and writes its id to `localStorage`; initial
  highlight is the active theme; a stored id maps to the right highlight after
  mount; a stale stored id falls back to active.
- **`src/app/(site)/layout.test.tsx`** (if a layout test is feasible) or a
  `Header` test — `Header` renders the switcher when given public themes.
- `getPublicThemes` (DB-backed) and the seed are verified by `build:verify` +
  a double `db:seed`, not a unit test (consistent with the repo).

## Files

**New:**
- `src/lib/themeApply.ts` + `src/lib/themeApply.test.ts`
- `src/lib/themeBoot.ts` + `src/lib/themeBoot.test.ts`
- `src/components/theme/ThemeSwitcher.tsx` + `.module.css` + `.test.tsx`
- `drizzle/0008_*.sql` (generated)

**Changed:**
- `src/db/schema.ts` — `is_public` column
- `src/services/types.ts` — `isPublic?: boolean` on `ThemeInput`; export a
  `PublicTheme` type (`{ id: number; name: string; isActive: boolean; style: Record<string,string> }`)
- `src/lib/validateAdmin.ts` — parse `isPublic` via `optBool`
- `src/db/content-write.ts` — persist `isPublic`
- `src/db/queries.ts` — `getPublicThemes`
- `src/db/seed.ts` — CyberPunk / Ember / Synthwave
- `src/app/layout.tsx` — embed public-themes JSON + pre-hydration inline script
- `src/app/(site)/layout.tsx` — `async`, read public themes, pass to `Header`
- `src/components/header/Header.tsx` — `publicThemes` prop, render `ThemeSwitcher`
- `src/app/admin/(dashboard)/ThemeForm.tsx` — semantic slot labels + "Show on site"
- `src/app/admin/(dashboard)/ThemeForm.test.tsx` — new labels + isPublic
- `src/app/admin/(dashboard)/themes/page.tsx` — "Public" column
- `src/app/admin/(dashboard)/themes/page.test.tsx` — public column

## Risks / watch-items

- **Static generation is the top invariant.** Nothing added to the root or
  `(site)` layout may read cookies/headers/`searchParams`. `getActiveTheme` and
  `getPublicThemes` are both `unstable_cache`d, so the layouts stay static;
  confirm with `build:verify` that `/` and `/contact` remain `○ (Static)`.
- **Flash of default theme.** Mitigated only if the inline script is *blocking*
  and placed before `{children}`. A deferred/async script would paint the
  default first. Verify by loading with a non-default theme saved.
- **Hydration mismatch in the switcher.** The server cannot know
  `localStorage`, so the switcher must render a deterministic initial highlight
  (the active theme) and reconcile to the stored id in an effect — never read
  `localStorage` during render.
- **Hero staleness on in-session switch is intentional in Spec A.** The DOM
  recolours instantly; the mounted hero does not. This is the documented A/B
  boundary, not a bug — Spec B fixes it. Returning visitors are unaffected
  (pre-hydration script colours the hero before it mounts).
- **`isPublic` vs `isActive`.** `isPublic` is editable through the form/validator;
  `isActive` remains settable only via the activate endpoint. Keep that
  distinction — `parseThemeInput` still must never accept `isActive`.
- **Shared cache tag.** `getPublicThemes` reuses the `"active-theme"` tag so
  existing mutations revalidate it. If a future change stops a mutation from
  tagging `"active-theme"`, the public list would go stale — keep all theme
  mutations tagging it.
