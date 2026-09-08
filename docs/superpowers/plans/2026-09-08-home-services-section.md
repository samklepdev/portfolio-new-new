# Home Services Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `ServicesSection` to the home page between About and Projects, carrying two service cards whose concentric-ring backgrounds ripple outward on hover.

**Architecture:** Two server components — `ServicesSection` (copy and card chrome) and `RingField` (the decorative SVG graphic) — plus colocated CSS modules. The ripple is pure CSS keyframes with a per-circle `animation-delay`; no JavaScript ships. The visual is adapted from the Radiant template's `LinkedAvatars`, which uses framer-motion; this reimplements the idea rather than porting it. `AboutSection` gives up its "what I do" framing so the two sections stop restating each other.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS Modules.

**Source spec:** `docs/superpowers/specs/2026-09-08-home-services-section-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **CSS Modules only.** Never introduce Tailwind directives, `tailwind.config.ts`, or postcss/autoprefixer. Tailwind was deliberately stripped from this project. The Radiant source you are adapting from is Tailwind — read it for the *values*, never copy its classes.
- **No new dependencies.** In particular do **not** install `framer-motion` or `motion`. The entire effect is CSS.
- **Server components.** No `"use client"` in either new file. No JavaScript ships for this feature.
- **Turquoise only.** `--neon-turquoise` / `#00f0ff` is the accent for both cards. Do not use `--neon-green` (reserved site-wide for status indicators) or `--neon-pink` (reserved for the contact CTA).
- **Section padding on one side only.** `padding: 6rem 0 0`. Neighbouring sections each bring their own `6rem` and padding does not collapse the way margins would. Adding bottom padding produces a `12rem` hole.
- **Inner container is `max-width: 64rem` with `padding: 0 2rem`** — matching `AboutSection` and the projects section. Not the Header/Footer's `78rem`/`1.5rem`; this is a page section, not chrome.
- **The graphic is decorative.** `RingField` renders `aria-hidden="true"` and contains no text, no links, and nothing focusable.
- **Do not commit `TODO.md`** under any circumstances. It is excluded via `.git/info/exclude`; never `git add -f` it. Use explicit paths in every `git add`.

## Verification Protocol (read before starting)

**This repository has no test framework.** There is no jest, vitest, playwright, or testing-library, and `package.json` exposes only `dev`, `build`, `lint`, and the `db:*` scripts. Do not write unit tests against a framework that does not exist, and do not add one — that is a project decision outside this plan's scope.

The verification cycle for every task is:

1. `npm run build` — this type-checks **and** lints. It is the gate.
2. A browser check against `http://localhost:3000` with the explicit pass criteria given in the task.

`tsc` alone is insufficient in this project: path-alias problems pass a type-check and still break the bundler. Always verify with `npm run build`.

The home page reads featured projects from Postgres. If the page 500s, the database is not running — `npm run db:up`, then `npm run db:migrate && npm run db:seed`.

## File Structure

| File | Responsibility |
|---|---|
| `src/components/home/ServicesSection.tsx` | Section element, eyebrow/heading, the two-card grid, service copy constant |
| `src/components/home/ServicesSection.module.css` | Section spacing, grid, card surface, hover trigger |
| `src/components/home/RingField.tsx` | The decorative SVG: 42 concentric circles plus the core node |
| `src/components/home/RingField.module.css` | Ring stroke, gradient mask, ripple keyframes, core node |
| `src/app/page.tsx` | Renders `<ServicesSection />` between About and the projects section |
| `src/components/home/AboutSection.tsx` | Heading and intro copy change only |

---

### Task 1: ServicesSection shell, wired into the home page

Builds the section with its copy and card layout, leaving the graphic slot empty. This lands a reviewable, correctly-spaced section before any SVG exists.

**Files:**
- Create: `src/components/home/ServicesSection.tsx`
- Create: `src/components/home/ServicesSection.module.css`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export function ServicesSection(): JSX.Element` — takes no props. Renders `<li className={styles.card}>` elements each containing `<div className={styles.graphic}>`, which Task 2 fills with `<RingField />`.

- [ ] **Step 1: Create the CSS module**

Create `src/components/home/ServicesSection.module.css`:

```css
.section {
  padding: 6rem 0 0;
}

.inner {
  margin: 0 auto;
  max-width: 64rem;
  padding: 0 2rem;
}

.eyebrow {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.heading {
  margin-top: 0.75rem;
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 600;
  color: #ffffff;
}

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

.card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  background-color: #12161f;
  transition: border-color 240ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .card:hover {
    border-color: rgba(0, 240, 255, 0.28);
  }
}

.graphic {
  position: relative;
  height: 13rem;
}

.body {
  position: relative;
  z-index: 1;
  padding: 0 1.75rem 1.75rem;
}

.cardTitle {
  font-size: 1.375rem;
  font-weight: 600;
  color: #ffffff;
}

.cardText {
  margin-top: 0.625rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.6);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
```

`.body` needs `position: relative; z-index: 1` because Task 2's ring field is absolutely positioned and would otherwise paint its strokes over the card's title and copy. The rings are *meant* to spread across the whole card; the z-index is what keeps the text readable on top of them. Do not instead clip the field with `overflow: hidden`.

The `.eyebrow` values are copied from `src/components/projects/ProjectCard.module.css:106-112` so the two eyebrows match exactly. The `.heading` values are copied from `src/components/home/AboutSection.module.css:51-55`.

- [ ] **Step 2: Create the component**

Create `src/components/home/ServicesSection.tsx`:

```tsx
import styles from "./ServicesSection.module.css";

const SERVICES = [
  {
    title: "Design & build",
    body: "Marketing sites taken from first wireframe to launch — responsive, fast, and structured so the people already searching for you actually land on you.",
  },
  {
    title: "Custom applications",
    body: "Dashboards, portals, and internal tools. The software that runs a business day to day, not just the site that describes it.",
  },
];

export function ServicesSection() {
  return (
    <section
      className={styles.section}
      id="services"
      aria-labelledby="services-heading"
    >
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Services</p>
        <h2 id="services-heading" className={styles.heading}>
          What I build
        </h2>

        <ul className={styles.grid}>
          {SERVICES.map((service) => (
            <li key={service.title} className={styles.card}>
              <div className={styles.graphic} />
              <div className={styles.body}>
                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardText}>{service.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

Copy the em dash in "launch — responsive" and the apostrophe-free wording exactly as written.

- [ ] **Step 3: Render it on the home page**

In `src/app/page.tsx`, add the import alongside the existing component imports:

```tsx
import { ServicesSection } from "@/components/home/ServicesSection";
```

Then place it between `<AboutSection />` and the projects `<section>`:

```tsx
      <AboutSection />
      <ServicesSection />
      <section className={styles.projects} id="projects">
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS. `✓ Compiled successfully`, then `✓ Generating static pages`. No lint errors.

- [ ] **Step 5: Browser check**

Run `npm run dev`, open `http://localhost:3000`, scroll to the section.

Pass criteria:
- The section sits between the About section and "Selected work".
- Eyebrow reads `SERVICES` in the mono face, uppercase; heading reads "What I build".
- Two cards side by side, equal width, with an empty `13rem` block above each card's text.
- Narrow the window below 720px: the cards stack to one column.
- The gap above the section matches the gap above "Selected work" — no doubled space.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/ServicesSection.tsx src/components/home/ServicesSection.module.css src/app/page.tsx
git commit -m "Add a services section to the home page"
```

---

### Task 2: RingField — static rings and core node

Fills the graphic slot with the concentric-ring field. No animation yet.

**Files:**
- Create: `src/components/home/RingField.tsx`
- Create: `src/components/home/RingField.module.css`
- Modify: `src/components/home/ServicesSection.tsx`

**Interfaces:**
- Consumes: `ServicesSection`'s `.graphic` wrapper from Task 1, which is `position: relative` and `13rem` tall. `RingField` positions itself absolutely inside it.
- Produces: `export function RingField(): JSX.Element` — takes no props. Each `<circle>` carries the CSS custom property `--i` set to its zero-based index, which Task 3 reads for the animation stagger.

- [ ] **Step 1: Create the CSS module**

Create `src/components/home/RingField.module.css`:

```css
.field {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  isolation: isolate;
}

.rings {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  mask-image:
    linear-gradient(to bottom, #000 90%, transparent),
    radial-gradient(circle, #000 0%, transparent 100%);
  -webkit-mask-image:
    linear-gradient(to bottom, #000 90%, transparent),
    radial-gradient(circle, #000 0%, transparent 100%);
  mask-composite: intersect;
  -webkit-mask-composite: source-in;
}

.ring {
  stroke: var(--neon-turquoise, #00f0ff);
  stroke-opacity: 0.15;
  transform-box: view-box;
  transform-origin: 250px 250px;
}

.core {
  position: relative;
  z-index: 1;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgba(0, 240, 255, 0.5);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(0, 240, 255, 0.25) 0%,
    rgba(0, 240, 255, 0.04) 70%
  );
  box-shadow: 0 0 24px rgba(0, 240, 255, 0.35);
}
```

The square `.rings` box sized at `130%` of the card width — rather than letting the SVG letterbox — keeps the circles circular while still reaching the card's left and right edges. The two-gradient mask is intersected so the field dissolves at the edges instead of ending at a hard box; this is the one detail carried over verbatim from Radiant's `linked-avatars.tsx:20`.

- [ ] **Step 2: Create the component**

Create `src/components/home/RingField.tsx`:

```tsx
import type { CSSProperties } from "react";
import styles from "./RingField.module.css";

const RING_COUNT = 42;
const RING_GAP = 8;

export function RingField() {
  return (
    <div className={styles.field} aria-hidden="true">
      <svg className={styles.rings} viewBox="0 0 500 500" fill="none">
        {Array.from({ length: RING_COUNT }, (_, index) => (
          <circle
            key={index}
            className={styles.ring}
            cx="250"
            cy="250"
            r={index * RING_GAP + 4}
            style={{ "--i": index } as CSSProperties}
          />
        ))}
      </svg>
      <span className={styles.core} />
    </div>
  );
}
```

The `as CSSProperties` cast is required: React's `CSSProperties` type does not permit arbitrary `--*` keys, and without the cast `npm run build` fails the type-check.

The count matches Radiant's 42. The gap does not: Radiant's `14` is tuned to its own render scale (~0.64, a 500-unit viewBox letterboxed into a 320px graphic) and yields ~9px on screen. Here the field renders at ~1.20 scale, so `14` would give ~17px — nearly twice as coarse. `8` gives ~9.6px and matches the source's density. Derive the gap from the rendered scale; copying `14` verbatim is the trap.

- [ ] **Step 3: Render it inside the cards**

In `src/components/home/ServicesSection.tsx`, add the import:

```tsx
import { RingField } from "./RingField";
```

Then replace the empty graphic div:

```tsx
              <div className={styles.graphic}>
                <RingField />
              </div>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS. If it fails with `Object literal may only specify known properties, and '"--i"' does not exist in type 'Properties<string | number, string & {}>'`, the `as CSSProperties` cast from Step 2 is missing.

- [ ] **Step 5: Browser check**

Run `npm run dev`, open `http://localhost:3000`, scroll to the section.

Pass criteria:
- Each card shows concentric turquoise rings, faint, centred, reaching the left and right card edges.
- The rings fade out toward the edges and toward the bottom — no hard rectangular cutoff.
- A glowing turquoise circle sits at the centre of each ring field.
- The rings are clipped by the card's rounded corners, not overflowing it.
- Nothing animates yet.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/RingField.tsx src/components/home/RingField.module.css src/components/home/ServicesSection.tsx
git commit -m "Add the concentric ring graphic to the service cards"
```

---

### Task 3: The hover ripple

Adds the staggered outward ripple, running only on hover or focus.

**Files:**
- Modify: `src/components/home/RingField.module.css`
- Modify: `src/components/home/ServicesSection.module.css`

**Interfaces:**
- Consumes: the `--i` custom property set per circle in Task 2, and the `.card` class from Task 1.
- Produces: the inherited custom property `--ring-animation`, set to the keyframe name by `.card:hover` inside a `@media (hover: hover) and (pointer: fine)` guard, and defaulting to `none`. The `@keyframes` are declared in `ServicesSection.module.css` alongside the trigger.

- [ ] **Step 1: Add the keyframes and animation to RingField.module.css**

Replace the `.ring` rule with:

```css
.ring {
  stroke: var(--neon-turquoise, #00f0ff);
  stroke-opacity: 0.15;
  transform-box: view-box;
  transform-origin: 250px 250px;
  animation: ripple 2s ease-in-out infinite;
  animation-delay: calc(var(--i) * 50ms);
  animation-name: var(--ring-animation, none);
}

@keyframes ripple {
  0% {
    transform: scale(1);
    stroke-opacity: 0.15;
  }
  18.75% {
    transform: scale(1.08);
    stroke-opacity: 0.4;
  }
  37.5% {
    transform: scale(1);
    stroke-opacity: 0.15;
  }
  100% {
    transform: scale(1);
    stroke-opacity: 0.15;
  }
}
```

The percentages are not arbitrary. Radiant runs `duration: 0.75` with `repeatDelay: 1.25`, a 2s period that is active for the first 37.5% and idle for the rest; `18.75%` is the midpoint of the active portion. `animation-delay: calc(var(--i) * 50ms)` reproduces framer-motion's `delay: n * 0.05`.

**Why a custom property carries the animation name:** the hover target (`.card`) lives in `ServicesSection.module.css` and the animated element (`.ring`) lives in `RingField.module.css`. CSS Modules hashes class names per file, so `.card:hover .ring` cannot be written across the two modules. The card sets `--ring-animation` and `.ring` reads `animation-name: var(--ring-animation, none)`; custom properties inherit through the DOM, so this crosses the boundary. Because the name goes to `none` on mouse-out, the animation is removed rather than paused and the rings snap back to rest.

**The `@keyframes` must be declared in `ServicesSection.module.css`, beside the trigger — not next to `.ring`.** css-loader scopes `@keyframes` names *and* the value of `--ring-animation` into the namespace of whichever file declares them. They resolve to the same identifier only when declared in the same file. Split them and the build emits **no keyframes at all**: `next build` still reports success, and the animation silently never runs. Wrapping the keyframes in `:global {}` does not help — that block is dropped outright. Verify by grepping the built CSS for `@keyframes` after any change here.

- [ ] **Step 2: Add the reduced-motion guard**

Append to `src/components/home/RingField.module.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .ring {
    animation: none;
  }
}
```

- [ ] **Step 3: Set the trigger in ServicesSection.module.css**

Add the custom property to the existing guarded hover rule, so it becomes:

```css
@media (hover: hover) and (pointer: fine) {
  .card:hover {
    border-color: rgba(0, 240, 255, 0.28);
    --ring-animation: serviceRingRipple;
  }
}
```

The `@media (hover: hover) and (pointer: fine)` guard is required, not decorative. On touch devices `:hover` latches after a tap and never releases, so an unguarded rule would leave the ripple running permanently on a phone — the opposite of the spec's "touch devices get the static field". This matches `src/components/projects/ProjectCard.module.css:203`, which guards its card hover the same way for the same reason.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Browser check**

Run `npm run dev`, open `http://localhost:3000`, scroll to the section.

Pass criteria:
- Nothing animates on page load, or while the pointer is elsewhere.
- Hovering a card starts a ripple that visibly travels outward from the centre — inner rings brighten and expand before outer ones, not all together. If every ring pulses in unison, `--i` is not reaching the circles; check the inline `style` in `RingField.tsx`.
- Hovering one card does **not** animate the other card's rings.
- The ripple pulses roughly every two seconds, with a clear pause between pulses.
- In macOS System Settings → Accessibility → Display → Reduce motion, enable it, reload, and hover: nothing animates at all.

Moving the pointer off a card removes the animation, so every ring returns to rest immediately rather than freezing mid-ripple. Re-hovering restarts the stagger from the first ring.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/RingField.module.css src/components/home/ServicesSection.module.css
git commit -m "Ripple the service card rings on hover"
```

---

### Task 4: Reframe AboutSection

Removes the overlap. `AboutSection` was headed "What I do" and listed the same offering split the new section now owns.

**Files:**
- Modify: `src/components/home/AboutSection.tsx:39-47`

**Interfaces:**
- Consumes: nothing. Produces: nothing. Copy change only — the `CAPABILITIES` constant, the component's structure, its CSS module, and the `about-heading` id are all untouched.

- [ ] **Step 1: Change the heading**

In `src/components/home/AboutSection.tsx`, change the `<h2>` text from `What I do` to `How I work`:

```tsx
          <h2 id="about-heading" className={styles.heading}>
            How I work
          </h2>
```

- [ ] **Step 2: Replace the intro paragraph**

Replace the entire `<p className={styles.intro}>` block with:

```tsx
          <p className={styles.intro}>
            Every project runs the same way: understand the business first, then
            build only what serves it. No templates dressed up as custom work,
            and nothing you&rsquo;ll need a developer to update.
          </p>
```

Note `&rsquo;` rather than a straight apostrophe — `react/no-unescaped-entities` is on, and a raw `'` fails the lint step of `npm run build`.

Leave the three `CAPABILITIES` items (Modern, Full-stack, SEO optimized) exactly as they are. They describe qualities of the work, which read correctly under "How I work" once the offerings have moved to the new section.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Browser check**

Run `npm run dev`, open `http://localhost:3000`.

Pass criteria:
- The About section heading reads "How I work"; the services heading below reads "What I build". Neither says "What I do".
- The three numbered capability items are unchanged.
- The "More about me →" link still works.
- Reading the two sections in sequence, they no longer restate the same claim.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/AboutSection.tsx
git commit -m "Reframe the home about section around how I work"
```

---

### Task 5: Responsive and final pass

**Files:**
- Modify (only if the checks below fail): `src/components/home/ServicesSection.module.css`, `src/components/home/RingField.module.css`

- [ ] **Step 1: Check at 390px**

Run `npm run dev`. In Chrome DevTools device toolbar, set the viewport to 390 × 844.

Pass criteria:
- Cards stack to one column.
- Card text does not overflow its card, and no horizontal scrollbar appears on `<body>`.
- The ring field still reaches both card edges and stays clipped inside the rounded corners.
- The heading does not wrap awkwardly — `clamp(2rem, 4vw, 2.75rem)` should hold it on one or two lines.

If the ring field looks too sparse at this width, reduce `.rings { width: 130% }` toward `100%`. Change nothing else.

- [ ] **Step 2: Check keyboard focus**

Tab through the page from the top.

Pass criteria:
- Focus never lands inside a service card — `RingField` is `aria-hidden` and contains nothing focusable, and the cards hold no links. (This is why there is no `:focus-within` trigger: with nothing focusable inside a card it could never fire, and dead selectors are worse than absent ones.)
- Focus order goes from the About section's "More about me" link straight to the "All projects" link.

- [ ] **Step 3: Full build**

Run: `npm run build`
Expected: PASS, 23+ static pages generated, no lint warnings.

- [ ] **Step 4: Commit any adjustments**

Only if Step 1 required a change:

```bash
git add src/components/home/ServicesSection.module.css src/components/home/RingField.module.css
git commit -m "Tune the service card rings for narrow viewports"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| Placement between About and Projects, top-only padding, 64rem inner | Task 1 |
| Card layout, two columns collapsing below 720px | Task 1, Task 5 |
| Copy — eyebrow, heading, both card bodies | Task 1 |
| 42 circles, `n * 8 + 4`, turquoise at 0.15 | Task 2 |
| Two-gradient intersected mask | Task 2 |
| Glowing core node | Task 2 |
| Ripple keyframes, 2s cycle, `--i` stagger | Task 3 |
| Hover only, guarded for touch, never on load | Task 3 |
| `prefers-reduced-motion` removes the animation | Task 3 |
| Touch devices get the static field | Task 3 (falls out of hover-only; no separate work) |
| About reframed to "How I work" with new intro | Task 4 |
| Server components, no client JS, no new deps | Global Constraints |
| Turquoise only | Global Constraints |
| `next build` passes; 390px legible | Task 5 |

No gaps.

**Placeholder scan:** none. Every code step carries complete code; every command carries expected output.

**Type consistency:** `RingField` is exported as `RingField` and imported as `./RingField` in Task 2 and referenced nowhere else. `ServicesSection` is exported and imported as `@/components/home/ServicesSection` in Task 1. The custom property is `--i` in Task 2 and read as `var(--i)` in Task 3; the handoff property is `--ring-animation` in both Task 3 steps. Class names used across tasks — `.card`, `.graphic`, `.ring`, `.rings`, `.field`, `.core` — are each defined once and spelled consistently.
