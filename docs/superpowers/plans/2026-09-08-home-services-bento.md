# Home Services Bento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `ServicesSection` from two equal cards to a four-card bento with 4/2/2/4 column spans, adding two new cards and making the ring field render at one consistent scale across all of them.

**Architecture:** Three edits to existing files — no new components. `ServicesSection.tsx` gains two entries in its `SERVICES` constant plus a span field; `ServicesSection.module.css` becomes a 6-column grid with span classes; `RingField.module.css` changes one sizing rule so the ring scale no longer depends on card width. Still server components, still no client JavaScript.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS Modules.

**Source spec:** `docs/superpowers/specs/2026-09-08-home-services-bento-design.md`

**Branch:** `feat/home-services-bento`, stacked on `feat/home-services-section` (PR #19, open). Do not merge or rebase that branch.

## Global Constraints

Every task's requirements implicitly include this section.

- **CSS Modules only.** No Tailwind directives, no `tailwind.config.ts`, no postcss/autoprefixer. Tailwind was deliberately stripped from this project.
- **No new dependencies.** No `framer-motion` / `motion`.
- **Server components.** No `"use client"`. No JavaScript ships for this feature.
- **Turquoise only.** `--neon-turquoise` / `#00f0ff`. Not `--neon-green` (reserved site-wide for status indicators), not `--neon-pink` (reserved for the contact CTA).
- **Do not touch the ripple handoff.** `.ring` reads `animation-name: var(--ring-animation, none)`; `.card:hover` sets it; the `@keyframes serviceRingRipple` live in `ServicesSection.module.css`. css-loader scopes `@keyframes` names *and* the `--ring-animation` value into the declaring file's namespace, so moving the keyframes to `RingField.module.css` emits **no keyframes at all** while `next build` still reports success. Leave that arrangement exactly as it is.
- **Keep the `@media (hover: hover) and (pointer: fine)` guard.** Touch latches `:hover` after a tap; without it the ripple runs forever on a phone.
- **Do not change the two existing cards' copy.** "Design & build" and "Custom applications" body text is approved and ships as-is.
- **Do not commit `TODO.md`.** It is excluded via `.git/info/exclude`; never `git add -f` it. Use explicit paths in every `git add`.

## Verification Protocol (read before starting)

**This repository has no test framework.** No jest, vitest, playwright, or testing-library; `package.json` exposes only `dev`, `build`, `lint`, and the `db:*` scripts. Do not write unit tests against a framework that does not exist, and do not add one.

The cycle for every task is:

1. `npm run build` — type-checks **and** lints. It is the gate.
2. A browser check with the task's explicit pass criteria.

Two repo-specific traps:

- **A green build is not evidence the CSS is right.** This feature has already shipped a build that compiled successfully while emitting zero `@keyframes`. When a task touches animation or generated class names, grep the built CSS under `.next/static/css/` to confirm what was actually emitted.
- **Verify layout against a production build, not the dev server.** A stale `.next` cache has previously made `page.css` stop applying entirely, which looks exactly like a CSS regression. If layout looks broken, `rm -rf .next && npm run build && npm start` before believing it.

The home page reads featured projects from Postgres. If it 500s: `npm run db:up`, then `npm run db:migrate && npm run db:seed`.

## File Structure

| File | Change |
|---|---|
| `src/components/home/RingField.module.css` | `.rings` sized by height instead of card width |
| `src/components/home/ServicesSection.tsx` | two new `SERVICES` entries, `span` field, span class lookup |
| `src/components/home/ServicesSection.module.css` | 6-column grid, `.wide` / `.narrow` span classes, tighter gap |

---

### Task 1: Make the ring scale independent of card width

Do this first. It is a prerequisite: once spans vary, a width-relative field renders at two different scales, and doing it after the layout change means shipping a visibly wrong intermediate state.

**Files:**
- Modify: `src/components/home/RingField.module.css`

**Interfaces:**
- Consumes: `.graphic` in `ServicesSection.module.css`, which is `position: relative` and `height: 13rem` in every card regardless of span. `.field` is `position: absolute; inset: 0` inside it.
- Produces: a ring field whose rendered scale is a function of the graphic height only, so any card width yields the same ring spacing.

- [ ] **Step 1: Change the `.rings` sizing**

In `src/components/home/RingField.module.css`, change the `.rings` rule's sizing lines from:

```css
  width: 130%;
  aspect-ratio: 1;
```

to:

```css
  height: 300%;
  width: auto;
  aspect-ratio: 1;
```

Leave every other declaration in that rule — `position`, `top`, `left`, `transform`, and both mask blocks — exactly as they are.

`300%` of the `13rem` graphic is `39rem` (624px), so the 500-unit viewBox renders at ~1.25 scale and the 8-unit ring gap lands at ~10px. That is near the ~9.6px the two-card version shipped with, and it is now identical in every card because `13rem` is constant while card width is not.

- [ ] **Step 2: Add the rationale comment**

Directly above the `.rings` rule, add:

```css
/* Sized off the graphic's height, never its width. The graphic slot is 13rem in
   every card, but bento spans make cards 632px and 304px wide — a width-relative
   field would render the same rings at ~13px and ~6px spacing in the two sizes.
   Height keeps one scale everywhere; wide cards just reveal more of the field. */
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS. `✓ Compiled successfully`, then static page generation, no lint errors.

- [ ] **Step 4: Browser check**

`npm run dev`, open `http://localhost:3000`, scroll to "What I build".

Pass criteria:
- Both cards still show ring fields that reach the left and right card edges.
- Ring spacing looks the same as before the change (this task is a no-op at equal widths — that is expected and correct).
- The glowing core is still centred; rings still fade at the edges.
- Hovering a card still ripples it; leaving still resets it.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/RingField.module.css
git commit -m "Size the ring field by graphic height so span changes cannot rescale it"
```

---

### Task 2: Add the two new cards and the bento grid

**Files:**
- Modify: `src/components/home/ServicesSection.tsx`
- Modify: `src/components/home/ServicesSection.module.css`

**Interfaces:**
- Consumes: Task 1's height-based ring sizing.
- Produces: a four-entry `SERVICES` constant where each entry has `title`, `body`, and `span` (`"wide" | "narrow"`), rendered onto `.card` plus `styles.wide` or `styles.narrow`.

- [ ] **Step 1: Replace the `SERVICES` constant**

In `src/components/home/ServicesSection.tsx`, replace the existing `SERVICES` constant with:

```tsx
const SERVICES = [
  {
    title: "Design & build",
    body: "Marketing sites taken from first wireframe to launch — responsive, fast, and structured so the people already searching for you actually land on you.",
    span: "wide",
  },
  {
    title: "Built with",
    body: "TypeScript and React on the front. C#/.NET or Node behind it. Postgres or SQL Server for the data.",
    span: "narrow",
  },
  {
    title: "From scope to launch",
    body: "Scope and estimate up front, design you sign off on, then build in visible increments. Working software early, not a reveal at the end.",
    span: "narrow",
  },
  {
    title: "Custom applications",
    body: "Dashboards, portals, and internal tools. The software that runs a business day to day, not just the site that describes it.",
    span: "wide",
  },
] as const;
```

The first and last entries' `body` strings are unchanged from what ships today — copy them exactly, including the em dash in "launch — responsive". Order matters: `4, 2, 2, 4` fills two rows of six exactly.

- [ ] **Step 2: Apply the span class**

In the same file, change the `<li>` so it picks up the span class:

```tsx
            <li
              key={service.title}
              className={`${styles.card} ${styles[service.span]}`}
            >
```

Leave the rest of the card markup — `.graphic` wrapping `<RingField />`, `.body`, `.cardTitle`, `.cardText` — untouched.

- [ ] **Step 3: Rework the grid**

In `src/components/home/ServicesSection.module.css`, replace this:

```css
.grid {
  display: grid;
  gap: 2rem;
  margin-top: 2.5rem;
  list-style: none;
}

@media (min-width: 720px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}
```

with this:

```css
.grid {
  display: grid;
  gap: 1.5rem;
  margin-top: 2.5rem;
  list-style: none;
}

/* Spans apply only above the breakpoint. Below it every card is full width, so
   .wide and .narrow must not resolve to a grid-column at all. */
@media (min-width: 720px) {
  .grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .wide {
    grid-column: span 4;
  }

  .narrow {
    grid-column: span 2;
  }
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

Note on `as const`: it is **not** required for the type-check. Next types CSS modules as `{ readonly [key: string]: string }` (`node_modules/next/types/global.d.ts:27`), so `styles[service.span]` resolves with a plain `string` index either way. Keep `as const` because it narrows `span` to `"wide" | "narrow"` and makes a typo a compile error at the constant rather than a silently missing class at runtime — but if the build fails, do not go looking there.

- [ ] **Step 5: Verify the emitted CSS**

A green build does not prove the span classes survived CSS Modules scoping. Run:

```bash
grep -o "ServicesSection_wide__[A-Za-z0-9_]*{[^}]*}" .next/static/css/*.css
grep -o "ServicesSection_narrow__[A-Za-z0-9_]*{[^}]*}" .next/static/css/*.css
```

Expected: one rule each, containing `grid-column:span 4` and `grid-column:span 2`. If either prints nothing, the class is not being emitted and the layout will silently fall back to one column per row.

- [ ] **Step 6: Browser check**

`npm run dev`, open `http://localhost:3000`, scroll to "What I build".

Pass criteria:
- Four cards in two rows. Row one: a wide "Design & build" then a narrow "Built with". Row two: a narrow "From scope to launch" then a wide "Custom applications".
- Each row fills the full container width with no gap at the end of a row.
- **All four ring fields show the same ring spacing.** This is the criterion Task 1 exists for — if the narrow cards' rings look finer than the wide cards', Task 1 did not take.
- Hovering any one card ripples only that card. Leaving it resets rather than freezing.
- Narrow the window below 720px: all four stack into one full-width column, in DOM order.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/ServicesSection.tsx src/components/home/ServicesSection.module.css
git commit -m "Lay the services cards out as a four-card bento"
```

---

### Task 3: Documentation and final pass

**Files:**
- Modify: `CLAUDE.md`
- Modify (only if a check below fails): `src/components/home/ServicesSection.module.css`

- [ ] **Step 1: Update `CLAUDE.md`**

Find the `- **Home services section**` bullet under `## Built`. Change its opening line from:

```
  Two service cards over a field of 42 concentric SVG rings that ripple outward on hover.
```

to:

```
  A four-card bento (spans 4/2/2/4 on a 6-column grid) over fields of 42 concentric SVG
  rings that ripple outward on hover.
```

Then add this as a fourth bullet in that entry's sub-list, after the ring-bleed bullet:

```
  - `RingField`'s `.rings` is sized by the graphic's **height** (`height: 300%`), never by
    card width. The graphic slot is `13rem` in every card but bento spans make cards ~632px
    and ~304px wide, so a width-relative field renders the same rings at ~13px and ~6px
    spacing. Do not "simplify" it back to a percentage width.
```

- [ ] **Step 2: Check the narrow cards at a small viewport**

`npm run build && npm start`, open `http://localhost:3000`, and reduce the window as far as Chrome allows (~500px on macOS — it will not go to 390px).

Pass criteria:
- All four cards are full width, single column, in DOM order.
- No card's copy overflows its card; no horizontal scrollbar on the page.
- Ring fields still reach both card edges.

If a narrow card's title wraps awkwardly at desktop width, reduce `.cardTitle` `font-size` from `1.375rem` to `1.25rem` **inside the `min-width: 720px` block only**. Change nothing else.

- [ ] **Step 3: Check keyboard focus is still clean**

Tab through the page.

Pass criteria:
- Focus never lands inside any of the four cards.
- Focus order still runs from About's "More about me" link to the "All projects" link.

- [ ] **Step 4: Final build**

Run: `npm run build`
Expected: PASS, 23+ static pages, no lint warnings.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "Record the services bento and the height-based ring sizing"
```

Include `src/components/home/ServicesSection.module.css` in the `git add` only if Step 2 required the font-size adjustment.

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Four cards, spans 4/2/2/4, DOM order = visual order | Task 2 |
| Two existing cards keep copy verbatim | Task 2 Step 1 |
| "Built with" and "From scope to launch" copy | Task 2 Step 1 |
| 6-column grid above 720px, one column below | Task 2 Step 3 |
| Gap tightened 2rem → 1.5rem | Task 2 Step 3 |
| Spans via a `span` field mapped to a CSS class, not inline styles | Task 2 Steps 1–2 |
| Ring field sized by height so all four scales match | Task 1 |
| Ripple handoff and hover guard untouched | Global Constraints |
| Same ring spacing in all four cards, verified | Task 2 Step 6 |
| Reduced motion still removes the animation | Task 2 Step 6 (ripple behaviour), unchanged code |
| No focusables; tab order preserved | Task 3 Step 3 |
| Narrow viewport legible, no horizontal overflow | Task 3 Step 2 |
| `npm run build` passes | every task |

No gaps.

**Placeholder scan:** none. Every code step carries the literal code; every command carries expected output.

**Type consistency:** `span` is `"wide" | "narrow"` via `as const` in Task 2 Step 1 and indexed as `styles[service.span]` in Step 2; the CSS classes `.wide` and `.narrow` are defined in Step 3 with exactly those names. `.grid`, `.card`, `.graphic`, `.body`, `.cardTitle`, `.cardText` are pre-existing and unchanged. `.rings` is the only `RingField.module.css` selector touched.
