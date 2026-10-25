# PageHeader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Contact page's contour + glow visual into a reusable `PageHeader` component and use it at the top of `/about`, `/projects`, and `/blog`.

**Architecture:** A server component `PageHeader` renders a bordered `#12161F` band containing the shared `ContourField` (relocated `contact/ → ui/`) plus the two-element glow, with a content layer (back link, `<h1>`, optional subtitle, optional children). Each page swaps its hand-rolled `back + <h1> (+ intro)` block for `<PageHeader …>`. Approach A (contained band, within each page's existing content column) — not full-bleed.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS Modules, vitest + @testing-library/react. No new dependencies, no client JS.

**Spec:** `docs/superpowers/specs/2026-10-25-page-header-design.md`

## Global Constraints

- **No new dependencies.** `package.json` is unchanged by this plan.
- **CSS Modules only, never Tailwind.** Server component — no `"use client"`.
- **The glow MUST stay two elements** (`.glow` blur wrapper + `.glowShape` clip-path). CSS applies `clip-path` after `filter`; combined on one element re-clips the blur to hard polygon edges. (Documented trap: CLAUDE.md, contact spec.)
- **`ContourField` keeps `preserveAspectRatio="slice"`, its top-right mask, and `vector-effect: non-scaling-stroke`.** Do not modify `ContourField` when relocating it.
- **Exactly one `<h1>` per page** — the `PageHeader` `title`. Never leave the old page `<h1>` behind.
- Colours: `#0B0E14` background, `#12161F` surface, `#00F0FF` turquoise, `#FF2E97` pink, `#B026FF` purple (glow gradient only), `#39FF88` green (status only — unused here).
- Every CSS module ends with `@media (prefers-reduced-motion: reduce)`; hover-only treatments wrapped in `@media (hover: hover) and (pointer: fine)`, with `:focus-visible` kept UNCONDITIONAL (outside the hover media query).
- **Builds:** never `npm run build` while `next dev` runs — use `npm run build:verify` (writes to `.next-verify`). Builds need the DB container up (`npm run db:up`).
- **Test gate:** baseline on `feat/page-header` is **81 passed / 5 pre-existing failures** (`src/components/about/Timeline.test.tsx` + `src/app/about/page.test.tsx`, the unrelated `8d79844` timeline-date bug — NOT ours). New tests must pass and the total failure count must stay at exactly 5.
- **Concurrent WIP in the working tree (NOT ours):** an untracked `src/services/` (axios API layer, has TS errors), modified `package.json`/`package-lock.json` (adds `axios`), a modified `public/images/documents/samuel-klepper-resume.pdf`, an uncommitted nav reorder in `src/lib/siteLinks.ts`, and two untracked `src/content/posts/pi-hosted-*.md` drafts. Do NOT stage, modify, revert, or commit any of them. **Use explicit pathspecs on every `git add`.** Because `tsconfig` includes `**/*.ts`, `src/services`' type errors break `next build`; for the build-gated tasks (Task 3 and Task 6) the executing controller moves `src/services` aside (`mv src/services <scratch>/`) before the build and restores it after that task's review — exactly as in the blog run. If `src/services` has since been made type-clean or removed, no set-aside is needed; check at execution time.

---

### Task 1: Relocate `ContourField` to `ui/`

`ContourField` becomes a shared primitive so both the Contact page and the new `PageHeader` can use it.

**Files:**
- Move: `src/components/contact/ContourField.tsx` → `src/components/ui/ContourField.tsx`
- Move: `src/components/contact/ContourField.module.css` → `src/components/ui/ContourField.module.css`
- Modify: `src/app/contact/page.tsx` (import path only)

**Interfaces:**
- Consumes: nothing.
- Produces: `ContourField` exported from `@/components/ui/ContourField` (unchanged signature: `function ContourField(): JSX.Element`, no props).

- [ ] **Step 1: Move the two files with git**

```bash
git mv src/components/contact/ContourField.tsx src/components/ui/ContourField.tsx
git mv src/components/contact/ContourField.module.css src/components/ui/ContourField.module.css
```

The relative import inside `ContourField.tsx` (`import styles from "./ContourField.module.css"`) stays valid because both files move together. Do not edit `ContourField.tsx` or its CSS.

- [ ] **Step 2: Update the contact page import**

In `src/app/contact/page.tsx`, change:

```ts
import { ContourField } from "@/components/contact/ContourField";
```

to:

```ts
import { ContourField } from "@/components/ui/ContourField";
```

- [ ] **Step 3: Verify no stale references remain**

Run: `grep -rn "components/contact/ContourField" src` — expect no output.

- [ ] **Step 4: Verify the contact page still renders (import resolves)**

Run: `npx vitest run src/app/contact/page.test.tsx`
Expected: PASS (the contact page test renders the page, which includes `ContourField`; a broken import would fail the file load).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ContourField.tsx src/components/ui/ContourField.module.css src/app/contact/page.tsx
git commit -m "Relocate ContourField to ui/ as a shared primitive"
```

---

### Task 2: `PageHeader` component

**Files:**
- Create: `src/components/ui/PageHeader.tsx`
- Create: `src/components/ui/PageHeader.module.css`
- Create: `src/components/ui/PageHeader.test.tsx`

**Interfaces:**
- Consumes: `ContourField` from `@/components/ui/ContourField` (Task 1).
- Produces:
  ```ts
  type PageHeaderProps = {
    title: string;
    backLinkText: string;
    backLinkHref?: string;      // default "/"
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
  };
  export function PageHeader(props: PageHeaderProps): JSX.Element
  ```
  Renders `title` as the only `<h1>`. The `.header` band carries its own `margin-bottom: 3rem`, so consuming pages do not manage the gap below it.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/PageHeader.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as the only h1", () => {
    render(<PageHeader title="Projects" backLinkText="Home" />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Projects");
  });

  it("adds no extra headings from the decorative backdrop", () => {
    render(<PageHeader title="Projects" backLinkText="Home" />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("renders the back link with the given text and a default href of /", () => {
    render(<PageHeader title="Projects" backLinkText="Home" />);
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("href", "/");
  });

  it("uses backLinkHref when provided", () => {
    render(<PageHeader title="Hello World" backLinkText="Blog" backLinkHref="/blog" />);
    expect(screen.getByRole("link", { name: /Blog/ })).toHaveAttribute("href", "/blog");
  });

  it("renders the subtitle only when provided", () => {
    const { rerender } = render(<PageHeader title="About" backLinkText="Home" />);
    expect(screen.queryByText("A short lede.")).not.toBeInTheDocument();
    rerender(<PageHeader title="About" backLinkText="Home" subtitle="A short lede." />);
    expect(screen.getByText("A short lede.")).toBeInTheDocument();
  });

  it("renders children in the content slot", () => {
    render(
      <PageHeader title="Projects" backLinkText="Home">
        <div data-testid="slot">extra</div>
      </PageHeader>,
    );
    expect(screen.getByTestId("slot")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/ui/PageHeader.test.tsx`
Expected: FAIL — cannot resolve `./PageHeader`.

- [ ] **Step 3: Write the component**

Create `src/components/ui/PageHeader.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { ContourField } from "@/components/ui/ContourField";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  title: string;
  backLinkText: string;
  backLinkHref?: string;
  subtitle?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({
  title,
  backLinkText,
  backLinkHref = "/",
  subtitle,
  children,
}: PageHeaderProps) {
  return (
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
  );
}
```

- [ ] **Step 4: Write the stylesheet**

Create `src/components/ui/PageHeader.module.css`:

```css
.header {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin-bottom: 3rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  background-color: #12161f;
}

.backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* Two elements on purpose: clip-path applies after filter, so blur + clip on one
   element re-clips the blur back to hard polygon edges. The blur lives on the
   wrapper; the clip on the child. Position is tuned for a wide, short band (the
   contact panel's glow sits lower for a tall panel). */
.glow {
  position: absolute;
  bottom: -18rem;
  left: -8rem;
  width: 56rem;
  aspect-ratio: 1155 / 678;
  filter: blur(64px);
}

.glowShape {
  width: 100%;
  height: 100%;
  opacity: 0.2;
  background-image: linear-gradient(
    to bottom right,
    var(--neon-purple, #b026ff),
    var(--neon-turquoise, #00f0ff)
  );
  clip-path: polygon(
    74.1% 56.1%, 100% 38.6%, 97.5% 73.3%, 85.5% 100%, 80.7% 98.2%,
    72.5% 67.7%, 60.2% 37.8%, 52.4% 32.2%, 47.5% 41.9%, 45.2% 65.8%,
    27.5% 23.5%, 0.1% 35.4%, 17.9% 0.1%, 27.6% 23.5%, 76.1% 2.6%, 74.1% 56.1%
  );
}

.content {
  position: relative;
  z-index: 1;
  padding: 3rem 2rem;
}

.back {
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  transition: color 200ms ease;
}

.back:focus-visible {
  color: var(--neon-turquoise, #00f0ff);
}

@media (hover: hover) and (pointer: fine) {
  .back:hover {
    color: var(--neon-turquoise, #00f0ff);
  }
}

.title {
  margin-top: 1.5rem;
  font-size: clamp(2.5rem, 5vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.subtitle {
  margin-top: 1rem;
  max-width: 46rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 640px) {
  .content {
    padding: 2.5rem 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .back {
    transition: none;
  }
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/components/ui/PageHeader.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/PageHeader.tsx src/components/ui/PageHeader.module.css src/components/ui/PageHeader.test.tsx
git commit -m "Add PageHeader component with the contour backdrop"
```

---

### Task 3: Use `PageHeader` on `/projects` + first build/browser tune

This is the first page `PageHeader` renders on, so it is also where the band/glow get eyeballed in a real browser and the glow position is finalized.

**Files:**
- Modify: `src/app/projects/page.tsx`
- Modify: `src/app/projects/page.module.css`
- Possibly modify: `src/components/ui/PageHeader.module.css` (only if the browser check shows the glow needs repositioning)

**Interfaces:**
- Consumes: `PageHeader` (Task 2).
- Produces: nothing new.

- [ ] **Step 1: Swap the header markup**

In `src/app/projects/page.tsx`, add the import (with the other imports):

```ts
import { PageHeader } from "@/components/ui/PageHeader";
```

Replace this block:

```tsx
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>
      <h1 className={styles.heading}>Projects</h1>
      <p className={styles.intro}>
        Everything published, most recent first.
        {total > PER_PAGE && (
          <span className={styles.count}>
            {" "}
            Showing {first}–{last} of {total}.
          </span>
        )}
      </p>
```

with:

```tsx
      <PageHeader
        title="Projects"
        backLinkText="Home"
        subtitle={
          <>
            Everything published, most recent first.
            {total > PER_PAGE && (
              <span className={styles.count}>
                {" "}
                Showing {first}–{last} of {total}.
              </span>
            )}
          </>
        }
      />
```

- [ ] **Step 2: Remove now-dead CSS and any unused import**

In `src/app/projects/page.module.css`, delete the `.back`, `.heading`, and `.intro` rules. **Keep `.count`** (still used in the subtitle) and `.page`.

In `src/app/projects/page.tsx`, if `Link` is no longer referenced anywhere in the file after the swap, remove `import Link from "next/link";` (grep the file for `<Link` / `Link(` to confirm before removing).

- [ ] **Step 3: Run the suite**

Run: `npm test`
Expected: still 81 passed / 5 pre-existing failures (no `/projects` page test exists, so no new test here; confirm nothing else regressed).

- [ ] **Step 4: Build and eyeball the band in a browser**

(Controller: if the concurrent `src/services` is present with type errors, move it aside first.)

Run: `npm run db:up && npm run build:verify`
Expected: build succeeds; output lists `/projects`.

Run: `npm run start:verify -- -p 3100`, open `http://localhost:3100/projects`, and confirm:
- The header is a bordered `#12161F` band with the topographic contour lines visible (fading from the top-right) and a soft purple→turquoise glow in the lower-left — **a soft blur, not a hard-edged polygon shard** (if it's a shard, the two-element glow split is broken).
- The back link, "Projects" `<h1>`, and the subtitle (with the count when there are >1 page of projects) sit above the backdrop and are legible.
- The grid sits a comfortable gap below the band.

If the glow sits wrong for the band's proportions, adjust `.glow`'s `bottom`/`left`/`width` in `src/components/ui/PageHeader.module.css` and rebuild until it reads as ambient light. Stop the server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/page.tsx src/app/projects/page.module.css src/components/ui/PageHeader.module.css
git commit -m "Use PageHeader on the projects page"
```

(If `PageHeader.module.css` was not touched in Step 4, omit it from the `git add`.)

---

### Task 4: Use `PageHeader` on `/blog`

**Files:**
- Modify: `src/app/blog/page.tsx`
- Modify: `src/app/blog/page.module.css`

**Interfaces:**
- Consumes: `PageHeader` (Task 2).
- Produces: nothing new.

- [ ] **Step 1: Swap the header markup**

In `src/app/blog/page.tsx`, add the import:

```ts
import { PageHeader } from "@/components/ui/PageHeader";
```

Replace this block:

```tsx
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>

      <h1 className={styles.heading}>Blog</h1>
      <p className={styles.intro}>
        Notes on building things — what broke, and what the fix actually was.
      </p>
```

with:

```tsx
      <PageHeader
        title="Blog"
        backLinkText="Home"
        subtitle="Notes on building things — what broke, and what the fix actually was."
      />
```

Leave everything below (the `TagFilter`, featured band, `PostList`, `Pagination`) exactly where it is — `TagFilter` stays in the body.

- [ ] **Step 2: Remove now-dead CSS and any unused import**

In `src/app/blog/page.module.css`, delete the `.back`, `.heading`, and `.intro` rules (keep `.page`, `.featured*`, etc.).

In `src/app/blog/page.tsx`, if `Link` is no longer referenced after the swap, remove `import Link from "next/link";` (grep `<Link` to confirm first).

- [ ] **Step 3: Run the blog test (unchanged assertions must still pass)**

Run: `npx vitest run src/app/blog/page.test.tsx`
Expected: PASS, 10 tests. The "exactly one h1" and `heading level 1 name "Blog"` assertions still hold because `PageHeader title="Blog"` renders that `<h1>`. The intro text is not asserted by the test, so moving it into the subtitle changes nothing.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: 81 passed / 5 pre-existing failures (count unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/app/blog/page.tsx src/app/blog/page.module.css
git commit -m "Use PageHeader on the blog page"
```

---

### Task 5: Use `PageHeader` on `/about`

**Files:**
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/about/page.module.css`

**Interfaces:**
- Consumes: `PageHeader` (Task 2).
- Produces: nothing new.

- [ ] **Step 1: Swap the header markup**

In `src/app/about/page.tsx`, add the import:

```ts
import { PageHeader } from "@/components/ui/PageHeader";
```

Replace this block:

```tsx
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>
      <h1 className={styles.heading}>About</h1>
```

with:

```tsx
      <PageHeader title="About" backLinkText="Home" />
```

Leave the `<div className={styles.inner}>…</div>` (rail + content) exactly as it is, directly after the `PageHeader`.

- [ ] **Step 2: Remove now-dead CSS**

In `src/app/about/page.module.css`, delete the `.back` and `.heading` rules. Keep `.page`, `.inner`, and everything else. (`.inner` already has no top margin; the band's `margin-bottom: 3rem` supplies the gap the old `.heading` margin used to.)

Do **not** remove `import Link from "next/link";` from `about/page.tsx` — `Link` is still used elsewhere on the page (the "/contact" link).

- [ ] **Step 3: Run the about test**

Run: `npx vitest run src/app/about/page.test.tsx`
Expected: the **"has exactly one h1"** test PASSES (the `PageHeader title="About"` renders the sole `<h1>`). This file also contains the pre-existing, unrelated Timeline-data failures — their count must be unchanged by this task. Confirm the only failures are the same pre-existing ones (the heading/h1-count test is green).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: 81 passed / 5 pre-existing failures (count unchanged — this task must not add or remove failures).

- [ ] **Step 5: Commit**

```bash
git add src/app/about/page.tsx src/app/about/page.module.css
git commit -m "Use PageHeader on the about page"
```

---

### Task 6: Full verification across all routes

**Files:** none (verification only; any fix lands in the file that owns the defect).

- [ ] **Step 1: Full suite + lint**

Run: `npm test && npm run lint`
Expected: 81 passed / 5 pre-existing failures; lint clean.

- [ ] **Step 2: Build**

(Controller: if the concurrent `src/services` is present with type errors, move it aside first; restore after this task's review.)

Run: `npm run db:up && npm run build:verify`
Expected: build succeeds; output lists `/about`, `/projects`, `/blog`, `/contact`.

- [ ] **Step 3: Serve and check every affected route**

Run: `npm run start:verify -- -p 3100`, then in a browser confirm:
- `http://localhost:3100/about` — `PageHeader` band with contour + soft glow, "About" `<h1>`, back link "← Home" → `/`; the rail/content below sits a clean gap under the band.
- `http://localhost:3100/projects` — band renders; subtitle shows the count when applicable; grid below.
- `http://localhost:3100/blog` — band renders; `TagFilter` still directly above the post list; featured band (if present) unaffected.
- `http://localhost:3100/contact` — **unchanged** from before (the `ContourField` move must not have altered it).
- On each, the glow is a soft blur (not a hard polygon shard), and there is exactly one `<h1>`.

Stop the server afterwards.

- [ ] **Step 4: No commit**

Verification only. If a defect is found, fix it in the owning file, re-run the relevant checks, and commit with a descriptive message.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| `PageHeader` name/location/props/structure | 2 |
| Server component, no client JS | 2 |
| Contour backdrop adapted to wide band | 2 (CSS), 3 (browser tune) |
| Two-element glow (blur/clip split) | 2 |
| `ContourField` relocation `contact/ → ui/` + contact import | 1 |
| Projects integration (subtitle carries the count) | 3 |
| Blog integration (TagFilter stays in body) | 4 |
| About integration | 5 |
| Single `<h1>` per page preserved | 2 (component), 4 & 5 (tests) |
| Dead `.back`/`.heading`/`.intro` CSS removed | 3, 4, 5 |
| New `PageHeader.test.tsx`; existing page tests green | 2, 4, 5 |
| Build + browser paint check (contour/glow render; contact unchanged) | 3, 6 |
| Contact page not otherwise converted (non-goal) | (no task — left as-is by design) |

**Placeholder scan:** No TBD/TODO; every code step carries complete code; integration tasks quote the exact current markup to replace.

**Type consistency:** `PageHeader(props: PageHeaderProps)` with `{ title, backLinkText, backLinkHref?="/", subtitle?, children? }` is defined in Task 2 and used identically in Tasks 3–5. `ContourField` (no props) relocated in Task 1 and imported by Task 2. The band's own `margin-bottom: 3rem` (Task 2) is what Tasks 3–5 rely on for spacing after removing the old heading/intro margins.

**One deliberate deviation from the literal spec props:** none — the component surface matches the approved spec exactly. The `margin-bottom: 3rem` on `.header` is an implementation detail (the spec said "the band owns the top spacing the pages' headings used to provide").
