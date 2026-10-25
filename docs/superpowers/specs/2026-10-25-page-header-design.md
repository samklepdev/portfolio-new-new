# PageHeader — reusable page header with the contour backdrop

**Date:** 2026-10-25
**Status:** Approved (owner, 2026-10-25). Decisions: **Approach A — contained band**; Blog's
`TagFilter` stays in the body (not the header `children`); implemented on a new `feat/page-header`
branch (cut from `feat/blog`, since the Blog page this edits exists only there).

## Goal

Extract the Contact page's "Get in touch" visual treatment — the generated topographic
`ContourField` plus the blurred gradient glow — into one reusable header component used at the top
of `/about`, `/projects`, and `/blog`. Each of those pages currently hand-rolls the same
`← Home` back link + `<h1>` (Projects and Blog also an intro `<p>`); this replaces that repetition
with a single parameterized component that also carries the contour/glow backdrop.

## Non-goals

- **The Contact page is not converted.** It keeps its bespoke two-column bleeding-panel layout;
  `PageHeader` does not fit it. It may adopt `PageHeader` later, but that is out of scope here.
- **Not a full-bleed hero (Approach B).** The header spans each page's existing content column, not
  the whole viewport. Full-bleed would require moving `max-width` off every `.page` onto an inner
  wrapper and re-tuning spacing — more change, more risk — and was the non-recommended alternative.
- No new dependencies, no client JS. The contour is deterministic server-rendered SVG; the glow is CSS.

## Component

- **Name:** `PageHeader` (deliberately not `Header` — that name is the site nav chrome in
  `src/components/header/`).
- **Location:** `src/components/ui/PageHeader.tsx` + `PageHeader.module.css` (+ `PageHeader.test.tsx`),
  beside the other cross-page shared UI (`AvailabilityStatus`).
- **Kind:** server component. No `"use client"`.

### Props

```ts
type PageHeaderProps = {
  title: string;                 // rendered as the page's single <h1>
  backLinkText: string;          // e.g. "Home"
  backLinkHref?: string;         // default "/"
  subtitle?: React.ReactNode;    // optional lede; rendered in a <p> only when provided
  children?: React.ReactNode;    // optional slot rendered below the subtitle
};
```

### Structure

```tsx
<header className={styles.header}>
  <div className={styles.backdrop} aria-hidden="true">
    <ContourField />
    <div className={styles.glow}>
      <div className={styles.glowShape} />
    </div>
  </div>

  <div className={styles.content}>
    <Link href={backLinkHref} className={styles.back}>
      <span aria-hidden="true">←</span> {backLinkText}
    </Link>
    <h1 className={styles.title}>{title}</h1>
    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    {children}
  </div>
</header>
```

- The backdrop is a sibling behind the content (`position: absolute; inset: 0; z-index: 0`), content
  is `position: relative; z-index: 1`. The backdrop is `aria-hidden` — it carries no information.

## Background treatment, adapted to a wide/short band

The Contact panel is tall and narrow; a page header is wide and short. `ContourField` already uses
`viewBox="0 0 640 760"` with `preserveAspectRatio="xMidYMid slice"`, a top-right radial mask, and
`vector-effect: non-scaling-stroke`, so it crops gracefully into a short band **with no change to
`ContourField` itself** — the visible crop is the upper-right contour cluster, which is exactly where
the mask keeps it strongest.

- **Surface:** `background-color: #12161f`; `border-bottom: 1px solid rgba(255,255,255,0.08)`;
  `overflow: hidden` on `.header` so the contour and glow are clipped to the band.
- **Glow:** reuse the two-element pattern verbatim — `.glow` (the `filter: blur(64px)` wrapper) and
  `.glowShape` (the `clip-path` gradient). **These MUST stay two elements** (CSS applies `clip-path`
  after `filter`; combined on one element re-clips the blur to hard polygon edges — documented trap
  in CLAUDE.md and the contact spec). The gradient (`--neon-purple → --neon-turquoise`, `opacity: 0.2`)
  and `clip-path` polygon are copied from `contact/page.module.css`. Only the glow's **position/size**
  is retuned for the short band (it currently sits at `top: calc(100% - 13rem); left: -14rem` for a
  tall panel) so it reads as ambient light in the lower-left of the band rather than falling off it.
  This duplicates the glow CSS block between Contact and PageHeader; that minor duplication is
  accepted (a shared `Glow`/`ContourBackdrop` extraction is a possible later cleanup, not this spec).

### `ContourField` relocation

`ContourField` is currently in `src/components/contact/`. It becomes a shared primitive:

- Move `src/components/contact/ContourField.tsx` → `src/components/ui/ContourField.tsx` and
  `ContourField.module.css` likewise.
- Update the import in `src/app/contact/page.tsx` (`@/components/contact/ContourField` →
  `@/components/ui/ContourField`). The Contact page is otherwise unchanged and must look identical.
- `ContourField` itself is not modified.

## Styling specifics

- `.header`: `position: relative; isolation: isolate; overflow: hidden; border-radius: 0.75rem`
  (bordered card look, consistent with cards elsewhere) — final radius/border decided during
  implementation against the real render; the bottom border/surface is the load-bearing part.
- `.content`: internal padding (roughly `3rem 2rem`) so the back link/title sit off the band edges;
  `position: relative; z-index: 1`. Constrain text measure for the subtitle (`max-width`).
- `.back`, `.title`, `.subtitle`: lift the type treatment from the existing pages verbatim — `.back`
  is the mono 0.8125rem muted link with turquoise hover; `.title` is `font-size: clamp(2.5rem, 5vw,
  3rem)` / weight 600 / `letter-spacing: -0.02em` (matches the contact heading, a slight upgrade over
  the plain 2.5rem on about/projects/blog — acceptable and intentional); `.subtitle` is the muted
  0.6-opacity intro.
- Ends with `@media (prefers-reduced-motion: reduce)` zeroing the back-link color transition; the
  back-link hover is wrapped in `@media (hover: hover) and (pointer: fine)` per the project convention.
- Responsive: the band reduces its padding below ~640px; the contour/glow need no breakpoint logic
  (they fill and crop).

## Per-page integration

Each page swaps its current `back + <h1> (+ intro)` block for `<PageHeader …>`; everything below is
unchanged. The band owns the top spacing the pages' headings used to provide (their `margin-bottom`
is removed).

- **Projects** (`src/app/projects/page.tsx`): replace the back link, `<h1>Projects</h1>`, and the
  `.intro` paragraph (which contains the result-count span) with
  `<PageHeader title="Projects" backLinkText="Home" subtitle={<>…existing intro text with the count span…</>} />`.
  The count markup moves into the `subtitle` node.
- **Blog** (`src/app/blog/page.tsx`): replace the back link, `<h1>Blog</h1>`, and the `.intro`
  with `<PageHeader title="Blog" backLinkText="Home" subtitle="Notes on building things — what broke, and what the fix actually was." />`.
  `TagFilter` stays where it is (directly above `PostList`); it is **not** moved into `children` in
  this spec — keeping it in the body preserves the current layout and the featured-band ordering.
- **About** (`src/app/about/page.tsx`): replace the back link and `<h1>About</h1>` with
  `<PageHeader title="About" backLinkText="Home" />` (no subtitle). The existing `.inner` rail +
  content follows below.

Each page's now-unused `.back` / `.heading` / `.intro` rules are removed from its `page.module.css`.

## Accessibility

- `title` is the page's single `<h1>`. Every page must still have **exactly one** `<h1>` after the
  change (see tests). The backdrop is `aria-hidden`.
- The back link keeps `← {backLinkText}` with the arrow `aria-hidden`.

## Testing

- **New `src/components/ui/PageHeader.test.tsx`:** renders the title as an `<h1>`; renders the back
  link with the given text and an `href` of `backLinkHref` (and `"/"` by default); renders the
  subtitle only when provided; renders `children` when provided; the backdrop is `aria-hidden` and
  the `ContourField` SVG is present but carries no accessible name.
- **Existing page tests stay green:** `src/app/about/page.test.tsx` and `src/app/blog/page.test.tsx`
  assert exactly one `<h1>` and specific heading/intro text — update any text queries that moved into
  `PageHeader`, and confirm the single-`<h1>` assertions still hold. (`/projects` has no page test
  today.)
- **Build + browser (jsdom has no paint):** `npm run build:verify` then serve and load `/about`,
  `/projects`, `/blog` to confirm the contour + glow actually render in the band and the glow is a
  soft blur (not a hard-edged polygon shard — the two-element check), and that `/contact` is
  unchanged after the `ContourField` move.

## Load-bearing notes (things that look like mistakes but are not)

- The glow MUST stay two elements (`.glow` blur wrapper + `.glowShape` clip-path). One element clips
  the blur to hard edges.
- `ContourField` keeps `preserveAspectRatio="slice"` + the top-right mask + `non-scaling-stroke` — do
  not "fix" the overflow/crop; that is what makes it read as a crop of terrain.
- Keep exactly one `<h1>` per page (the `title`); do not leave the old page `<h1>` in place.

## Decisions (resolved with owner 2026-10-25)

1. Layout: **Approach A — contained band.** (Not full-bleed.)
2. Blog's `TagFilter` **stays in the body**, directly above `PostList` — not moved into the header.
3. Giving the Contact page the same treatment stays **out of scope** (possible later).
