# Client Logo Band Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old site's auto-scrolling client carousel with a static, monochrome band of twelve client logos, placed between the About section and Selected work on the home page.

**Architecture:** One server component (`ClientBand`) plus a colocated CSS module. The logo list is a hand-ordered constant inside the component — not a database table, because the logo set and the project set disagree in both directions. Logos are sized by height with a per-logo optical correction, and knocked out to a single white via a CSS filter so twelve brand palettes do not compete on a dark page. No JavaScript ships.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS Modules, `next/image`.

**Source spec:** `docs/superpowers/specs/2026-09-07-client-logo-band-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **CSS Modules only.** Never introduce Tailwind directives, `tailwind.config.ts`, or postcss/autoprefixer. Tailwind was deliberately stripped from this project.
- **Server component.** No `"use client"` in either new file. No JavaScript ships for this feature.
- **Logos are not links.** The band is credibility, not navigation. Do not wrap logos in `Link` or `<a>`, and do not add `tabindex`.
- **No count in the copy.** The label is exactly `Businesses I've built for`. Do not add a count, a year, or a "since 2020"-style qualifier.
- **Monochrome knockout:** `filter: brightness(0) invert(1)` at `opacity: 0.55`. Hover lifts opacity to `1` and **keeps** the knockout — it must not restore brand colour, because several logos are black artwork that would vanish on the dark background.
- **Every logo needs a genuinely transparent background.** `sips -g hasAlpha` is not a sufficient check: it reports whether the channel exists, not whether it is used. Audit by sampling border-pixel alpha.
- **SVG sources require `unoptimized`** on `next/image`. The optimizer returns 400 for SVG unless `dangerouslyAllowSVG` is set. Precedent: `src/components/header/Header.tsx:66-72`.
- **Section padding on one side only.** Neighbouring sections each bring their own `6rem` and padding does not collapse the way margins would.
- **No new dependencies, no schema change, no migration.**
- **Do not commit `TODO.md`** under any circumstances. It is excluded via `.git/info/exclude`; never `git add -f` it. Use explicit paths in every `git add`.

## Verification Protocol (read before starting)

**This repository has no test framework.** There is no jest, vitest, playwright, or testing-library, and `package.json` exposes only `dev`, `build`, `lint`, and the `db:*` scripts. Do not write unit tests against a framework that does not exist, and do not add one — that is a project decision outside this plan's scope.

The verification cycle for every task is:

1. `npm run build` — this type-checks **and** lints. It is the gate.
2. A browser check against `http://localhost:3000` with the explicit pass criteria given in the task.

`tsc` alone is insufficient in this project: path-alias problems pass a type-check and still break the bundler. Always verify with `npm run build`.

---

### Task 1: Build the ClientBand component and place it on the home page

**Files:**
- Create: `src/components/home/ClientBand.tsx`
- Create: `src/components/home/ClientBand.module.css`
- Modify: `src/app/page.tsx` (add import; insert element between the About placeholder and the `.projects` section)

**Interfaces:**
- Consumes: nothing from other tasks. Assets already exist in `public/images/logos/`.
- Produces: `export function ClientBand()` — a named export taking no props, imported by `src/app/page.tsx`. Task 2 tunes the `CLIENTS` constant inside `ClientBand.tsx` and the `--logo-height` value in `ClientBand.module.css`; neither changes this signature.

**Asset notes:** Use exactly these twelve files. Do **not** use `public/images/logos/dss.jpg` — it is `dss-logo.png` flattened onto a white background, so it has no alpha and duplicates a file that does.

`baylor-logo.png`, `mHawk.png` and `ud.png` shipped with opaque backgrounds and have already been repaired in the repo — they are transparent now, and the `width`/`height` values in `CLIENTS` are the **post-trim** dimensions, not the originals. Do not re-measure them against any older copy.

If a logo is ever added, audit it first: `sips -g hasAlpha` is **not** a sufficient check, because it reports whether an alpha channel exists rather than whether it is used. An opaque RGBA file passes it and still renders as a solid white rectangle. Sample border-pixel alpha instead.

- [ ] **Step 1: Create the component**

Create `src/components/home/ClientBand.tsx`:

```tsx
import type { CSSProperties } from "react";
import Image from "next/image";
import styles from "./ClientBand.module.css";

type ClientLogo = {
  /** Doubles as alt text — these names appear nowhere else on the page. */
  name: string;
  src: string;
  width: number;
  height: number;
  /**
   * Optical correction. At equal height a square badge carries far more ink
   * than a wordmark and reads as louder, so the square marks are knocked back.
   * Tuned by eye against the rendered band, not computed.
   */
  scale?: number;
  /** SVG only: the image optimizer 400s on SVG without dangerouslyAllowSVG. */
  unoptimized?: boolean;
};

/**
 * A hand-ordered list, not a database query. The logo set and the project set
 * disagree in both directions — Melissa Hawkins, PsycTech, and Baylor have logos
 * and no project file, while One Time Close, C-Bit, TicHelper, and Super Chef
 * have projects and no logo — so a `clients` table would mean a migration for
 * twelve static rows that nothing queries, joined on a relationship that is
 * partial either way.
 *
 * Order is chosen so wide wordmarks and square badges alternate rather than
 * clumping into lopsided rows. Adding a client means inserting where it balances,
 * not appending.
 */
const CLIENTS: ClientLogo[] = [
  {
    name: "BuildOn Technologies",
    src: "/images/logos/buildon-logo.png",
    width: 408,
    height: 100,
  },
  {
    name: "FHA",
    src: "/images/logos/fha-logo.png",
    width: 360,
    height: 120,
  },
  {
    name: "DeLeon Safety Solutions",
    src: "/images/logos/dss-logo.png",
    width: 400,
    height: 340,
    scale: 0.85,
  },
  {
    name: "Baylor College of Medicine",
    src: "/images/logos/baylor-logo.png",
    width: 124,
    height: 101,
    scale: 0.85,
  },
  {
    name: "PsycTech",
    src: "/images/logos/psyctech-logo.png",
    width: 800,
    height: 254,
  },
  {
    name: "Melissa Hawkins Photography",
    src: "/images/logos/mHawk.png",
    width: 259,
    height: 72,
  },
  {
    name: "Winfield's Chocolate Bar",
    src: "/images/logos/winfields-logo.svg",
    width: 158,
    height: 159,
    scale: 0.85,
    unoptimized: true,
  },
  {
    name: "Ultra Demolition",
    src: "/images/logos/ud.png",
    width: 185,
    height: 111,
  },
  {
    name: "Gulf Winds International",
    src: "/images/logos/gwi-logo.png",
    width: 143,
    height: 142,
    scale: 0.85,
  },
  {
    name: "WealthGuard Insurance Group",
    src: "/images/logos/wig-logo.png",
    width: 184,
    height: 191,
    scale: 0.85,
  },
  {
    name: "Becks Prime",
    src: "/images/logos/becks-logo.png",
    width: 191,
    height: 147,
    scale: 0.85,
  },
  {
    name: "Edge196",
    src: "/images/logos/edge196.svg",
    width: 68,
    height: 67,
    scale: 0.85,
    unoptimized: true,
  },
];

/**
 * Credibility at a glance, not a second index into the work — the project grid
 * below owns navigation. Deliberately static: a band that moves cannot be
 * scanned in the second a visitor gives it, and logos parked offscreen make the
 * set feel unknowable.
 */
export function ClientBand() {
  return (
    <section className={styles.section} aria-labelledby="clients-heading">
      <h2 id="clients-heading" className={styles.heading}>
        Businesses I&rsquo;ve built for
      </h2>

      <ul className={styles.list}>
        {CLIENTS.map((client) => (
          <li key={client.src} className={styles.item}>
            <Image
              className={styles.logo}
              src={client.src}
              alt={client.name}
              width={client.width}
              height={client.height}
              unoptimized={client.unoptimized}
              // Per-logo optical correction, read by .logo in the CSS module.
              // A custom property is not in CSSProperties, hence the cast.
              style={
                client.scale
                  ? ({ "--logo-scale": client.scale } as CSSProperties)
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Create the stylesheet**

Create `src/components/home/ClientBand.module.css`:

```css
/* Top padding only: the projects section below brings its own 6rem and padding
   does not collapse the way margins would. Matches PlaceholderSection. */
.section {
  margin: 0 auto;
  max-width: 64rem;
  padding: 6rem 2rem 0;
}

/* globals.css puts every h2 on the display face — this label is an eyebrow, not
   a heading in the visual hierarchy, so it opts back out to mono. */
.heading {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
}

.list {
  --logo-height: 2.5rem;

  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2.5rem 3.5rem;
  margin-top: 2.5rem;
}

.item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--logo-height);
}

/* Sized by height, never by width. The set spans 3.00 (FHA, a wide wordmark) to
   0.96 (WealthGuard, taller than wide); matching on width would render FHA as a
   hairline and WealthGuard as a slab. Setting height AND width together also
   keeps next/image from warning about a single modified dimension.

   The knockout is what lets twelve brand palettes sit on #0B0E14 without
   becoming a ransom note — they flatten to one white and read as one texture. */
.logo {
  height: calc(100% * var(--logo-scale, 1));
  width: auto;
  max-width: 10rem;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.55;
  transition: opacity 200ms ease;
}

/* Hover lifts brightness and keeps the knockout. It deliberately does NOT
   restore brand colour: Melissa Hawkins and Ultra Demolition are black artwork
   and would vanish against #0B0E14, and Baylor is white type so nothing would
   visibly happen. An opacity lift works for every logo whatever its source
   colour, and reads as texture rather than as "this is a link".

   Hover only — there is no focus state to style, because the logos are not
   links and must not be made focusable. */
.logo:hover {
  opacity: 1;
}

@media (max-width: 639px) {
  .list {
    --logo-height: 1.75rem;

    gap: 2rem 2.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .logo {
    transition: none;
  }
}
```

- [ ] **Step 3: Place it on the home page**

In `src/app/page.tsx`, add the import alongside the existing component imports:

```tsx
import { ClientBand } from "@/components/home/ClientBand";
```

Then insert the element between the About placeholder and the projects section, so the region reads:

```tsx
      <PlaceholderSection
        id="about"
        title="About"
        href="/about"
        linkLabel="More about me"
      />

      {/* Proof between the introduction and the work: who I am, who trusted me,
          then the work itself. */}
      <ClientBand />

      {/* Project grid renders normally underneath — no 3D cost here,
          this section should stay fast/crawlable regardless of WebGL support */}
      <section className={styles.projects} id="projects">
```

Leave the rest of `page.tsx` unchanged — `export const revalidate = 60`, the `getFeaturedProjects()` call, and the Contact placeholder all stay as they are.

- [ ] **Step 4: Verify the build**

Run: `npm run build`

Expected: `✓ Compiled successfully`, no TypeScript errors, no ESLint warnings. `/` must still be listed as prerendered with a `1m` revalidate — the band is a server component and must not have turned the route dynamic. If `/` shows as `ƒ` (Dynamic), stop and investigate before continuing.

- [ ] **Step 5: Verify in the browser**

Run `npm run dev` and open `http://localhost:3000`. Scroll past the hero to the band.

Pass criteria:
- All twelve logos render — no broken images, no missing files.
- Every logo is white/monochrome, not in its brand colours. In particular, no logo renders as a filled white rectangle — that means its source lacks an alpha channel.
- Hovering one logo restores its full colour.
- The label reads `BUSINESSES I'VE BUILT FOR` in uppercase mono, not in the Space Grotesk display face.
- The band sits between the About heading and "Selected work".
- Nothing is clickable — the logos are not links.

Note: on a cold dev server the first request through the image optimizer is slow and logos may appear blank for a few seconds. Wait and reload before treating a blank logo as a failure.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/ClientBand.tsx src/components/home/ClientBand.module.css src/app/page.tsx
git commit -m "Add a static client logo band to the home page

Replaces the old site's scrolling client carousel. The band is credibility
at a glance, not navigation, so it is static and the logos are unlinked.

Logos are knocked out to a single white so twelve brand palettes do not
compete on the dark background, and sized by height because the set spans
a 3:1 wordmark to a taller-than-wide badge."
```

---

### Task 2: Optical balance pass

Task 1 ships defensible defaults; this task makes the band actually look right. A logo strip lives or dies on whether the marks read as equal weight, and that cannot be computed — it has to be seen. This is a separate task because a reviewer can accept Task 1's structure and still reject its balance.

**Files:**
- Modify: `src/components/home/ClientBand.tsx` (`scale` values and array order only)
- Modify: `src/components/home/ClientBand.module.css` (`--logo-height`, `gap`, `max-width` only)

**Interfaces:**
- Consumes: `ClientBand` from Task 1, rendered on `/`.
- Produces: no API change. Tuning values only.

- [ ] **Step 1: Render the band at desktop width**

With `npm run dev` running, view `http://localhost:3000` at a viewport of at least 1200px wide. Scroll to the band.

- [ ] **Step 2: Judge weight, not size**

Look at the band with your eyes unfocused, or squint. You are checking whether any mark jumps forward or recedes relative to its neighbours — not whether they are the same physical size.

The square badges (DeLeon, Winfield's, WealthGuard, Becks, Baylor, Gulf Winds, Edge196) ship at `scale: 0.85`. The wide wordmarks (BuildOn, Melissa Hawkins, PsycTech, FHA, Ultra Demolition) ship unscaled.

Adjust the `scale` value on any individual logo that reads too heavy or too light. Sensible range is `0.7` to `1.0`. Change one logo at a time and re-look — changing several at once makes it impossible to tell which change helped.

Three specific things to check, because they are the most likely to be wrong:
- **BuildOn** at `4.08` is the widest mark in the set. At `2.5rem` tall it wants ~163px of width, which exceeds the `max-width: 10rem` (160px) ceiling — so it will be width-constrained and render slightly short. **Melissa Hawkins** at `3.60` sits right at the limit. If either reads short next to its neighbours, raise `max-width` on `.logo` rather than scaling them up.
- **Edge196** is a small square SVG at `68×67`. It may need to go below `0.85`.
- **Tagline text will not survive**, and that is expected — FHA's "another American dream comes true", DeLeon's "SAFETY SOLUTIONS LLC", PsycTech's "Technology for Psychology" and Melissa Hawkins' "PHOTOGRAPHY" all go illegible at `2.5rem`. They read as texture. Do not raise `--logo-height` to try to rescue them; that would make the band shout.

- [ ] **Step 3: Check the row break**

At desktop width the twelve logos should break into balanced rows rather than leaving one orphan on a final row. If a single logo is stranded alone, reorder the `CLIENTS` array so wide and square marks alternate differently. Do not add or remove logos to force a break.

- [ ] **Step 4: Check narrow viewports**

Resize the browser to 375px wide. Expected: roughly three logos per row, still legible, no horizontal scrollbar on the page. `html, body { overflow-x: hidden }` in `globals.css` will mask an overflow rather than showing a scrollbar, so confirm by checking that no logo is visually clipped at the right edge.

If logos are too small to recognise at 375px, raise `--logo-height` inside the `@media (max-width: 639px)` block from `1.75rem`. If they crowd, raise the `gap`.

- [ ] **Step 5: Check the vertical rhythm**

Confirm the band does not read as a full-weight section competing with About and Selected work. It should feel subordinate — a quiet strip between two sections.

If it reads too loud, reduce `.section` top padding from `6rem` to `5rem`, and/or drop `.heading` colour from `rgba(255, 255, 255, 0.4)` to `0.32`. Do not add a border or background to separate it; the palette rules keep this band quiet.

- [ ] **Step 6: Verify the build still passes**

Run: `npm run build`

Expected: `✓ Compiled successfully`, no errors or warnings, `/` still prerendered with `1m` revalidate.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/ClientBand.tsx src/components/home/ClientBand.module.css
git commit -m "Tune optical balance of the client logo band

Per-logo scale corrections and spacing adjustments so the twelve marks read
as equal weight rather than equal size."
```

---

## Notes for the reviewer

- **The band asserts no count.** If a number appears anywhere in the copy, reject it. Twelve logo files against fifteen project files, three logos naming companies with no project, four projects with no logo, and duplicate project entries for FHA and WealthGuard — no figure is defensible without reconciling two stores and keeping it true as work is added.
- **Hover on an unlinked logo is a known, accepted tradeoff.** It suggests a click target that is not there. The spec keeps it because it reads as texture rather than a promise. Removing it is a one-line deletion if you disagree; it is not an oversight.
- **`dss.jpg` stays in the repo untouched.** It is unused by this feature. Deleting it is out of scope.
