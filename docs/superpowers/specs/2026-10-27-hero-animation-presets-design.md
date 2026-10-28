# Hero animation presets (theming pipeline — Phase 2)

**Date:** 2026-10-27
**Status:** Draft, pending approval

## Goal

Let an admin theme choose the hero's *animation style*, not just its colours.
Each theme carries a `heroPreset` naming one of four curated motions —
**orbit** (today's hero), **drift**, **pulse**, **wave** — and the active
theme's preset drives the live hero's ambient motion, delivered through the
same `<html>`-custom-property pipeline Phase 1 built for colour.

This is **Phase 2** of the theming pipeline. Phase 1
(`docs/superpowers/specs/2026-10-26-site-theming-pipeline-design.md`, merged in
PR #38) added admin-published themes that recolour the site and re-tint the
hero particles, and deliberately left the hero's single motion untouched,
naming "a hero animation-style preset per theme and the `HeroScene` refactor to
switch motion" as this spec's job. Phase 1 left a clean seam: it neither added
the `heroPreset` column nor changed motion.

## Non-goals

- No change to the scroll choreography. The hero's disperse-outward + fade +
  camera push-in on scroll is page-level choreography and stays **identical for
  every preset**. Presets vary only the at-rest ambient motion.
- No live animated preview in the admin form. The preset is chosen by a
  labelled selector with one-line descriptions; the admin sees it live on the
  real site after activating. (A preview would mean mounting a second heavy
  `ssr:false` WebGL canvas in the form — out of scope.)
- No new API routes. The existing POST/PUT already pass the parsed theme input
  through `upsertTheme`; the parser simply starts carrying `heroPreset`.
- No change to the colour pipeline, the one-active invariant, the
  `unstable_cache`/`revalidateTag("active-theme")` wiring, or the device-tier
  budgets (2500/800 particles, bloom on `full`, DPR cap).

## Current state

- **Schema** `src/db/schema.ts` — `themes` table: `id`, unique `name`, six hex
  colour columns (with neon defaults), `isActive` (`is_active`),
  `createdAt`/`updatedAt`. No motion column.
- **Hero** `src/components/hero/HeroScene.tsx` — client-only (`next/dynamic`,
  `ssr:false`). A `ParticleField` builds a spherical shell (radius 4–10) of
  2500/800 particles in a `useMemo` keyed on `count`, reading the three accent
  colours once via `readVar(name, fallback)` (a `getComputedStyle` helper). Its
  `useFrame` does two things: (1) **ambient** `rotation.y += delta * 0.03`;
  (2) **scroll** — reads `useScrollStore.getState().progress`, sets
  `scale = 1 + progress * 2.2` and `opacity = max(0, 1 - progress * 1.4)`. A
  `CameraRig` pushes the camera in on scroll (`z = 10 - progress * 2`).
- **Theme → CSS** `src/lib/themeStyle.ts` — `paletteToStyle(theme | null)`
  returns `{}` for null, else the six colour custom properties. Spread onto
  `<html style>` in the root `layout.tsx` (an `async` server component that
  reads `getActiveTheme()`).
- **Validation** `src/lib/validateAdmin.ts` — `parseThemeInput(body)` returns
  `Validated<ThemeInput>`: requires `name`, requires each of `THEME_COLORS`
  (the six colour keys) as a `HEX_RE`-valid string. Never reads `isActive`.
- **Write** `src/db/content-write.ts` — `upsertTheme(input, { id? })` maps the
  seven `ThemeInput` fields into insert/update values; update path returns
  `row ?? null`; unique-violation → `NameConflictError`.
- **Reads** `src/db/admin-queries.ts` `listThemes()`/`getTheme(id)` and
  `src/db/queries.ts` `getActiveTheme` all use `db.select()` (the whole row),
  so a new column flows through to `ThemeRow` automatically. The API routes
  (`.../themes/route.ts`, `.../themes/[id]/route.ts`) return those rows verbatim
  via `NextResponse.json(row)` — **there is no DTO mapper to update**; a new row
  field is serialized for free.
- **Types** `src/services/types.ts` — `ThemeInput` (name + six colours);
  `ThemeRowDTO = ThemeInput & { id; isActive }`.
- **Admin form** `src/app/admin/(dashboard)/ThemeForm.tsx` — name field + a
  `SLOTS`-driven grid of six colour inputs; `onSubmit` emits a `ThemeInput`.
- **List** `src/app/admin/(dashboard)/themes/page.tsx` — a `DataTable` with
  Name, a Palette swatch strip, a Status (Active pill) column, and row actions
  (Edit / Activate / Delete), plus a "Use default theme" button.
- **Seed** `src/db/seed.ts` — one idempotent, inactive sample theme "Sunset"
  via `onConflictDoUpdate` on `name`.

## The four presets

All operate on the **existing spherical-shell geometry** and keep the scroll
behaviour identical. Each is a pure function of the current frame; none changes
the particle count, colours, bloom, or camera.

| Preset  | Ambient motion | Ambient scale |
|---------|----------------|---------------|
| `orbit` | `rotation.y += delta * 0.03` — today's hero, verbatim | 1 |
| `drift` | slow `rotation.y += delta * 0.01` plus a gentle bob: `rotation.x = sin(elapsed * 0.15) * 0.12` | 1 |
| `pulse` | slow `rotation.y += delta * 0.02`; the shell breathes | `1 + sin(elapsed * 0.8) * 0.06` |
| `wave`  | slow `rotation.y += delta * 0.015`; a travelling sine displaces each particle along Z: `z = baseZ + sin(baseX * 0.6 + elapsed * 1.2) * 0.25` (per-vertex, positions marked `needsUpdate`) | 1 |

`orbit` is the default and reproduces the current hero exactly (same rotation
constant, scale 1, no extra motion), so a site with no active theme — or a
theme whose preset is unknown — looks exactly as it does today.

### Motion contract

```ts
type MotionCtx = {
  elapsed: number;          // state.clock.elapsedTime
  delta: number;            // frame delta
  basePositions: Float32Array; // the useMemo-built shell, never mutated
};

// Mutates points' rotation and (for wave) its geometry positions.
// Returns the ambient scale multiplier (1 unless the preset breathes).
type HeroMotion = (points: THREE.Points, ctx: MotionCtx) => number;
```

Shared per-frame code (unchanged responsibilities, now preset-aware):

```ts
const ambientScale = motion(points, { elapsed, delta, basePositions });
const progress = useScrollStore.getState().progress;      // unchanged
points.scale.setScalar(ambientScale * (1 + progress * 2.2)); // scroll on top of ambient
material.opacity = Math.max(0, 1 - progress * 1.4);        // unchanged
```

So the scroll dispersal composes multiplicatively over `pulse`'s breathing, and
the camera rig is untouched. `wave` needs the base positions to displace from a
stable origin each frame — `ParticleField` keeps the `positions` Float32Array
from its `useMemo` and passes it as `basePositions`; `wave` writes into the live
geometry attribute and sets `needsUpdate = true`. At 2500/800 points this is a
sub-millisecond loop and stays within the tier budget.

`wave` is the one preset that touches per-vertex data per frame; the other three
are transform-only. This is deliberate and the reason `basePositions` is in the
contract even though three presets ignore it.

## Data flow (Option A — same pipeline as Phase 1)

The preset is a discrete enum string, delivered exactly like the colours:

```
themes.hero_preset (text, NOT NULL DEFAULT 'orbit')
  → getActiveTheme()                 (whole-row select, cached + tagged)
  → themeToStyle(theme)              emits --hero-preset: <name> + the 6 colours
  → <html style={...}>               (root layout, server component)
  → HeroScene reads --hero-preset once in the init useMemo (never per frame)
  → resolveHeroMotion(name) → HeroMotion   (defaults to orbit on empty/unknown)
```

No active theme → `themeToStyle(null)` returns `{}` → no `--hero-preset` →
`readVar("--hero-preset", "orbit")` yields `orbit`. Same fallback shape as the
colour pipeline. The read happens once at field init, honouring the hero's
"read CSS vars imperatively, never per-frame" rule (CLAUDE.md).

## Stack changes

### 1. Schema + migration
`src/db/schema.ts`: add to `themes`
```ts
heroPreset: text("hero_preset").notNull().default("orbit"),
```
Then `npm run db:generate` (emits `drizzle/0007_*.sql`) and `npm run db:migrate`.
Commit the generated migration. Do not hand-edit it.

### 2. Shared preset constant
`src/lib/heroPresets.ts` (new) — the single source of truth for the valid set,
imported by the validator, the form, and `resolveHeroMotion`:
```ts
export const HERO_PRESETS = ["orbit", "drift", "pulse", "wave"] as const;
export type HeroPreset = (typeof HERO_PRESETS)[number];
export const DEFAULT_HERO_PRESET: HeroPreset = "orbit";
export const HERO_PRESET_LABELS: Record<HeroPreset, string> = {
  orbit: "Orbit — a slow, steady rotation (the classic look)",
  drift: "Drift — a calm wander with a gentle bob",
  pulse: "Pulse — the field breathes in and out",
  wave:  "Wave — a travelling ripple across the particles",
};
```

### 3. Types
`src/services/types.ts`: add `heroPreset: string;` to `ThemeInput` (so
`ThemeRowDTO` inherits it). Keep it `string` at the DTO boundary (the wire type);
the `HeroPreset` union is enforced at the validation and motion-resolution
edges, matching how the colour fields are plain `string` here.

### 4. Validation
`src/lib/validateAdmin.ts`: after the colour loop, resolve the preset.
`heroPreset` is **optional in the body** (defaults to `orbit` when absent) but
**rejected when present and not a known preset**:
```ts
import { HERO_PRESETS, DEFAULT_HERO_PRESET } from "@/lib/heroPresets";
// ...
const rawPreset = (body as Record<string, unknown>).heroPreset;
let heroPreset: string = DEFAULT_HERO_PRESET;
if (rawPreset !== undefined) {
  if (typeof rawPreset !== "string" || !HERO_PRESETS.includes(rawPreset as never)) {
    return { ok: false, error: `Invalid hero preset: "${String(rawPreset)}"` };
  }
  heroPreset = rawPreset;
}
return { ok: true, value: { name, ...colors, heroPreset } };
```

### 5. Write
`src/db/content-write.ts` `upsertTheme`: add `heroPreset: input.heroPreset` to
the `values` object (carried into both the insert and the update `.set`).

### 6. Theme → CSS, with the rename
`src/lib/themeStyle.ts`: **rename `paletteToStyle` → `themeToStyle`** (it now
emits more than a palette) and add the preset var:
```ts
export function themeToStyle(theme: ThemeRowDTO | null): Record<string, string> {
  if (!theme) return {};
  return {
    "--background": theme.background,
    "--foreground": theme.foreground,
    "--neon-turquoise": theme.turquoise,
    "--neon-pink": theme.pink,
    "--neon-purple": theme.purple,
    "--neon-green": theme.green,
    "--hero-preset": theme.heroPreset,
  };
}
```
Update the one import + call site in `src/app/layout.tsx` and the test file
`src/lib/themeStyle.test.ts` to the new name. (`ThemeRow` from a whole-row
select already carries `heroPreset`; `ThemeRowDTO` now declares it, so the
server layout's `getActiveTheme()` row satisfies the param.)

### 7. Hero refactor
`src/components/hero/HeroScene.tsx`:
- Add `resolveHeroMotion(name: string): HeroMotion` — a pure map from name to
  motion fn, falling back to the `orbit` fn for empty/unknown input. Export it
  for unit testing.
- Define the four `HeroMotion` fns per the table above.
- In `ParticleField`: read `const preset = readVar("--hero-preset", "orbit")`
  and `const motion = resolveHeroMotion(preset)` inside the existing init
  `useMemo` (alongside the colour reads), and keep the `positions` array
  available as `basePositions`. Rewrite `useFrame` to call `motion(...)` then
  apply the shared scroll scale/opacity shown in the Motion contract. `CameraRig`
  is unchanged.

### 8. Admin form
`src/app/admin/(dashboard)/ThemeForm.tsx`: add `heroPreset` to the form state
(init from `initial?.heroPreset ?? DEFAULT_HERO_PRESET`) and include it in the
`onSubmit` payload. Render a `fieldset` "Hero animation" of four radios, one per
`HERO_PRESETS`, labelled from `HERO_PRESET_LABELS`, placed after the colour
grid. Reuse `FormFields.module.css` / `themes.module.css` classes; the
`fieldset` gets an accessible name via a `legend`. One radio is always checked
(default orbit), so the control can never submit an empty preset.

### 9. List column
`src/app/admin/(dashboard)/themes/page.tsx`: add an **"Animation"** column
after Palette, `sort: (t) => t.heroPreset`, `cell: (t) => t.heroPreset`, so the
admin sees each theme's preset at a glance.

### 10. Seed
`src/db/seed.ts`: give "Sunset" a non-default `heroPreset: "pulse"` in its
`values`, and add `heroPreset: sql\`excluded.hero_preset\`` to the
`onConflictDoUpdate` set so re-seeding stays idempotent and exercises the column.

## Testing

Same philosophy as Phase 1: jsdom has no WebGL, so the live motion is verified
by loading the page, and unit tests cover only pure logic and wiring.

- **`src/components/hero/HeroScene.test.ts`** (new) — `resolveHeroMotion`
  returns a distinct function for each of the four names, and returns the
  **orbit** function for `""`, `"nope"`, and an unknown string. (The motion
  maths themselves are not unit-tested — verified live.)
- **`src/lib/validateAdmin.test.ts`** — extend the theme cases: a valid preset
  is accepted and echoed; an absent `heroPreset` defaults to `orbit`; a present
  but unknown preset (`"spin"`) is rejected with a 400-shaped error; existing
  colour/name cases still pass with the new field present.
- **`src/lib/themeStyle.test.ts`** — update to the `themeToStyle` name; assert
  the returned object includes `"--hero-preset"` equal to the theme's preset,
  and still `{}` for `null`.
- **`src/app/admin/(dashboard)/ThemeForm.test.tsx`** — the four radios render
  with their labels; orbit is checked by default; selecting another radio and
  submitting calls `onSubmit` with that `heroPreset`; editing an existing theme
  pre-selects its preset.
- **`src/app/admin/(dashboard)/themes/page.test.tsx`** — the Animation column
  renders a row's preset name.

## Files

**New:**
- `src/lib/heroPresets.ts`
- `src/components/hero/HeroScene.test.ts`
- `drizzle/0007_*.sql` (generated)

**Changed:**
- `src/db/schema.ts` — `hero_preset` column
- `src/services/types.ts` — `heroPreset` on `ThemeInput`
- `src/lib/validateAdmin.ts` — parse/validate `heroPreset`
- `src/lib/validateAdmin.test.ts` — preset cases
- `src/db/content-write.ts` — persist `heroPreset`
- `src/lib/themeStyle.ts` — rename to `themeToStyle` + `--hero-preset`
- `src/lib/themeStyle.test.ts` — rename + preset var assertion
- `src/app/layout.tsx` — `themeToStyle` call site
- `src/components/hero/HeroScene.tsx` — `resolveHeroMotion` + four motions + `useFrame` refactor
- `src/app/admin/(dashboard)/ThemeForm.tsx` — hero-animation radios
- `src/app/admin/(dashboard)/ThemeForm.test.tsx` — radio tests
- `src/app/admin/(dashboard)/themes/page.tsx` — Animation column
- `src/app/admin/(dashboard)/themes/page.test.tsx` — column assertion
- `src/db/seed.ts` — Sunset gets a preset

## Risks / watch-items

- **CSS var holding an enum string.** `--hero-preset` is a non-colour custom
  property read by JS, not CSS. Unusual but intentional: it keeps the Phase 2
  delivery mechanism identical to Phase 1's and avoids threading a prop across
  the `ssr:false` dynamic boundary. The value is always one of a closed set
  (validated on write) and falls back to `orbit` on anything unexpected.
- **`wave` per-frame cost.** It is the only preset that mutates geometry each
  frame. Kept cheap by displacing from the cached `basePositions` with a single
  sine and the existing tier-capped counts; no reallocation. If it ever shows
  up in a frame budget, it can be demoted to a transform-only sway, but at
  2500/800 points it is negligible.
- **The rename touches Phase 1 code.** `paletteToStyle → themeToStyle` is a
  three-site change (the function, `layout.tsx`, the test). Approved as a
  focused honesty fix, not scope creep.
- **Fallback must be exact.** `orbit` must reproduce today's hero bit-for-bit
  (rotation constant `0.03`, scale `1`), so the no-theme and unknown-preset
  paths are visually indistinguishable from the current site. The
  `resolveHeroMotion` unknown→orbit test guards the mapping; the constant is
  guarded by code review against this spec.
- **Device tiers unchanged.** Presets do not read or alter `useDeviceTier`;
  counts, bloom, and DPR stay exactly as they are. A preset is motion only.
