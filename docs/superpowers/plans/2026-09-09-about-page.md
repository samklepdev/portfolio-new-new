# /about Page Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/about` as a sticky-rail dossier that surfaces the bio, a four-role timeline, a grouped technology stack, and two attributable client testimonials — all in page source, none behind an interaction.

**Architecture:** Two columns above 900px. A sticky left rail holds identity and CTAs (portrait, name, title, availability status, résumé + contact buttons, socials); the right column scrolls through bio → timeline → stack → testimonials. Below 900px the rail unsticks and stacks on top. Two pieces of duplicated state are extracted first — the "Available for work" pill (currently copy-pasted across two components) and the testimonial data (currently hardcoded in `ContactSection`) — so the new page consumes shared modules rather than adding third copies.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, CSS Modules. Vitest + Testing Library + jsdom for tests. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-09-about-page-design.md`

## Global Constraints

- **CSS Modules only.** Never Tailwind. Do not add `@tailwind` directives, `tailwind.config.ts`, or postcss/autoprefixer.
- **No new runtime dependencies.** Nothing added to `dependencies` in `package.json`. Test tooling goes in `devDependencies` only. Specifically: do not add `react-icons`.
- **No database changes.** Nothing under `drizzle/`, nothing in `src/db/`. This is static biographical content.
- **Accent discipline** — one accent dominates, the rest stay sparse:
  - Turquoise `var(--neon-turquoise, #00f0ff)` — dominant: section headings, timeline nodes, chip borders, contact link.
  - Pink `var(--neon-pink, #ff2e97)` — the résumé CTA only.
  - Purple `var(--neon-purple, #b026ff)` — portrait glow only.
  - Green `var(--neon-green, #39ff88)` — `AvailabilityStatus` only.
- **No GSAP, no WebGL, no scroll-triggered animation on this page.** CSS hover transitions only. The orchestrated motion moment belongs to the hero.
- **All transitions disabled** under `@media (prefers-reduced-motion: reduce)`.
- **Never invent content.** No star ratings, no metrics, no per-role job descriptions. Every string on the page traces to the spec.
- **Exact job title for all four timeline roles:** `Software Engineer`.
- **Exact availability label:** `Available for work`.
- External links use `target="_blank" rel="noopener noreferrer"`.

---

## File Structure

**Create:**
- `vitest.config.ts` — test runner config, `@/*` alias, jsdom environment
- `vitest.setup.ts` — `@testing-library/jest-dom` matchers
- `src/lib/testimonials.ts` — shared testimonial data
- `src/components/ui/AvailabilityStatus.tsx` + `.module.css` — shared status pill
- `src/components/about/Timeline.tsx` + `.module.css`
- `src/components/about/TechStack.tsx` + `.module.css`
- `src/components/about/Testimonials.tsx` + `.module.css`

**Modify:**
- `src/lib/siteLinks.ts:15` — remove the GitLab entry
- `src/components/home/ContactSection.tsx:6-14,39-42` — consume shared modules
- `src/components/home/ContactSection.module.css:53-71` — drop the local status rules
- `src/app/contact/page.tsx:24-27` — consume `AvailabilityStatus`
- `src/app/contact/page.module.css:63-84` — drop the local status rules
- `src/app/about/page.tsx` — full rewrite
- `src/app/about/page.module.css` — full rewrite
- `package.json` — `test` script + devDependencies

**Task order rationale:** Tasks 1–4 are extractions and cleanups that must land before the about page consumes them. Tasks 5–8 build the page. Each task is independently reviewable and leaves the build green.

---

### Task 1: Test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` (single run) and `npm run test:watch`. The `@/*` alias resolves to `./src/*` inside tests. `@testing-library/jest-dom` matchers (`toBeInTheDocument`, `toHaveAttribute`) are globally available. `describe`/`it`/`expect` are global — no imports needed in test files.

- [ ] **Step 1: Install test tooling as devDependencies**

```bash
npm install -D vitest@^2 @vitejs/plugin-react@^4 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6
```

Verify nothing landed in `dependencies`:

```bash
node -e "const p=require('./package.json'); const bad=Object.keys(p.dependencies).filter(d=>/vitest|testing-library|jsdom/.test(d)); console.log(bad.length ? 'FAIL: '+bad : 'OK: runtime deps clean')"
```

Expected: `OK: runtime deps clean`

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Note: the `@` alias must be declared here as well as in `tsconfig.json`. Vitest does not read `tsconfig` paths.

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add the test scripts to `package.json`**

Add to the `scripts` block, after `"lint": "eslint"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 5: Write a smoke test proving the harness works**

Create `src/lib/siteLinks.test.ts`:

```ts
import { EMAIL, RESUME_URL, SOCIAL_LINKS } from "@/lib/siteLinks";

describe("siteLinks", () => {
  it("exposes the samklep.dev address", () => {
    expect(EMAIL).toBe("hello@samklep.dev");
  });

  it("points the resume at the committed PDF", () => {
    expect(RESUME_URL).toBe("/images/documents/samuel-klepper-resume.pdf");
  });

  it("includes a GitHub link", () => {
    const ids = SOCIAL_LINKS.map((link) => link.id);
    expect(ids).toContain("github");
  });
});
```

- [ ] **Step 6: Run the test to verify the harness resolves the alias**

Run: `npm test`
Expected: PASS, 3 tests. If it fails with "Cannot find module '@/lib/siteLinks'", the alias in `vitest.config.ts` is wrong — fix it before continuing.

- [ ] **Step 7: Verify the build still passes**

Run: `npm run build`
Expected: exit 0. `vitest.config.ts` and `vitest.setup.ts` are at the repo root and must not break the Next build.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts src/lib/siteLinks.test.ts
git commit -m "Add Vitest so the about-page extractions have a guard"
```

---

### Task 2: Extract `AvailabilityStatus`

The pill exists twice today, byte-identical except for a `margin-bottom`:
`ContactSection.module.css:53-71` and `contact/page.module.css:63-84`. `src/app/toast.css:3` documents the toast theme as derived from it, so its appearance is already load-bearing beyond its two call sites.

**Files:**
- Create: `src/components/ui/AvailabilityStatus.tsx`
- Create: `src/components/ui/AvailabilityStatus.module.css`
- Create: `src/components/ui/AvailabilityStatus.test.tsx`
- Modify: `src/components/home/ContactSection.tsx:38-42`, `src/components/home/ContactSection.module.css:53-71`
- Modify: `src/app/contact/page.tsx:24-27`, `src/app/contact/page.module.css:63-84`

**Interfaces:**
- Consumes: Task 1's test harness.
- Produces: `AvailabilityStatus`, a named export taking an optional `className?: string` that is appended to the root element's class list. Renders the literal text `Available for work`. Later tasks pass `className` to control outer margin — the component itself carries none.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/AvailabilityStatus.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";

describe("AvailabilityStatus", () => {
  it("renders the availability label as text", () => {
    render(<AvailabilityStatus />);
    expect(screen.getByText("Available for work")).toBeInTheDocument();
  });

  it("appends a caller-supplied className to the root", () => {
    const { container } = render(<AvailabilityStatus className="spaced" />);
    expect(container.firstChild).toHaveClass("spaced");
  });

  it("hides the decorative dot from assistive tech", () => {
    const { container } = render(<AvailabilityStatus />);
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- AvailabilityStatus`
Expected: FAIL — "Failed to resolve import '@/components/ui/AvailabilityStatus'".

- [ ] **Step 3: Create the component**

`src/components/ui/AvailabilityStatus.tsx`:

```tsx
import styles from "./AvailabilityStatus.module.css";

type AvailabilityStatusProps = {
  className?: string;
};

export function AvailabilityStatus({ className }: AvailabilityStatusProps) {
  return (
    <p className={[styles.status, className].filter(Boolean).join(" ")}>
      <span className={styles.dot} aria-hidden="true" />
      Available for work
    </p>
  );
}
```

- [ ] **Step 4: Create the stylesheet**

`src/components/ui/AvailabilityStatus.module.css` — lifted verbatim from `ContactSection.module.css:53-71`, minus the `margin-bottom` (callers own spacing):

```css
.status {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3125rem 0.75rem;
  border: 1px solid rgba(57, 255, 136, 0.28);
  border-radius: 999px;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: var(--neon-green, #39ff88);
}

.dot {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  background-color: var(--neon-green, #39ff88);
  box-shadow: 0 0 8px rgba(57, 255, 136, 0.8);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- AvailabilityStatus`
Expected: PASS, 3 tests.

- [ ] **Step 6: Refactor the home page call site**

In `src/components/home/ContactSection.tsx`, add the import beside the existing ones:

```tsx
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
```

Replace lines 39-42:

```tsx
          <p className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            Available for work
          </p>
```

with:

```tsx
          <AvailabilityStatus />
```

No `className` is passed here. Verified: `ContactSection.module.css` `.status` carries **no `margin-bottom`** — its spacing comes entirely from the `.aside` flow — so the shared component's own styles are already a complete match.

Then in `src/components/home/ContactSection.module.css`, **delete both the `.status` rule (lines 52-63) and the `.statusDot` rule (lines 65-71)** outright. Nothing replaces them.

- [ ] **Step 7: Refactor the contact page call site**

In `src/app/contact/page.tsx`, add:

```tsx
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
```

Replace lines 24-27:

```tsx
        <p className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          Available for work
        </p>
```

with:

```tsx
        <AvailabilityStatus className={styles.status} />
```

In `src/app/contact/page.module.css`, replace `.status` (lines 63-76) with only its spacing and **delete `.statusDot`** (lines 78-84):

```css
.status {
  margin-bottom: 2rem;
}
```

This call site **does** keep a `className` — unlike `ContactSection`, the contact page's pill carries `margin-bottom: 2rem`, which is exactly the spacing the shared component deliberately does not own. The two call sites differing here is correct, not an oversight.

- [ ] **Step 8: Verify no orphaned references remain**

```bash
grep -rn "statusDot" src/ ; echo "exit=$?"
```

Expected: no matches, `exit=1`.

- [ ] **Step 9: Verify build and tests**

Run: `npm test && npm run build`
Expected: both exit 0.

- [ ] **Step 10: Visually confirm both call sites are unchanged**

Run `npm run dev`, then check `http://localhost:3000/#contact` and `http://localhost:3000/contact`. The green pill must look identical to before — same border, same glow, same spacing below it. This is a pure refactor; any visual change is a bug.

- [ ] **Step 11: Commit**

```bash
git add src/components/ui src/components/home/ContactSection.tsx src/components/home/ContactSection.module.css src/app/contact/page.tsx src/app/contact/page.module.css
git commit -m "Extract the availability pill instead of copying it a third time"
```

---

### Task 3: Extract testimonial data

`ContactSection.tsx:6-14` hardcodes the DeLeon testimonial. The about page needs the same record plus one more, and duplicating copy attributed to a real named person across two files invites drift.

**Files:**
- Create: `src/lib/testimonials.ts`
- Create: `src/lib/testimonials.test.ts`
- Modify: `src/components/home/ContactSection.tsx:6-14` and its `TESTIMONIAL` references

**Interfaces:**
- Consumes: Task 1's test harness.
- Produces:

```ts
export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  title: string;
  company: string;
  logo: { src: string; width: number; height: number };
};

export const TESTIMONIALS: readonly Testimonial[];
export const getTestimonial: (id: string) => Testimonial;
```

`getTestimonial` throws on an unknown id rather than returning `undefined`, so a typo surfaces at build time instead of rendering an empty card. Ids are `"deleon"` and `"ultra"`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/testimonials.test.ts`:

```ts
import { TESTIMONIALS, getTestimonial } from "@/lib/testimonials";

describe("testimonials", () => {
  it("carries both attributable testimonials", () => {
    expect(TESTIMONIALS).toHaveLength(2);
  });

  it("attributes every testimonial to a named person and company", () => {
    for (const testimonial of TESTIMONIALS) {
      expect(testimonial.name.length).toBeGreaterThan(0);
      expect(testimonial.title.length).toBeGreaterThan(0);
      expect(testimonial.company.length).toBeGreaterThan(0);
      expect(testimonial.quote.length).toBeGreaterThan(0);
    }
  });

  it("looks a testimonial up by id", () => {
    expect(getTestimonial("deleon").name).toBe("Martha DeLeon");
    expect(getTestimonial("ultra").name).toBe("Xavier Chavaria");
  });

  it("throws on an unknown id rather than rendering nothing", () => {
    expect(() => getTestimonial("nope")).toThrow();
  });

  it("carries no rating field", () => {
    for (const testimonial of TESTIMONIALS) {
      expect(testimonial).not.toHaveProperty("rating");
    }
  });
});
```

The last assertion is deliberate. The old site rendered five stars from a `rating` field; the spec drops ratings, and this keeps them from creeping back.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- testimonials`
Expected: FAIL — "Failed to resolve import '@/lib/testimonials'".

- [ ] **Step 3: Create the module**

`src/lib/testimonials.ts`. Quote text is copied verbatim from `ContactSection.tsx:7-8` and `portfolio-1/pages/about.tsx:48`:

```ts
export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  title: string;
  company: string;
  logo: { src: string; width: number; height: number };
};

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "ultra",
    quote:
      "When we needed a website fast, Sam delivered what we needed in the time we needed it. From start to finish, all the features we needed to manage our social media presence were met.",
    name: "Xavier Chavaria",
    title: "Owner/Operator",
    company: "Ultra Demolition",
    logo: { src: "/images/logos/ud.png", width: 185, height: 111 },
  },
  {
    id: "deleon",
    quote:
      "I approached Sam with only a rough idea in mind and he helped me bring my idea to fruition. Sam helped with a logo, unique design & functional contact forms to keep up with customer demands.",
    name: "Martha DeLeon",
    title: "CEO",
    company: "DeLeon Safety Solutions",
    logo: { src: "/images/logos/dss-logo.png", width: 400, height: 340 },
  },
] as const;

export function getTestimonial(id: string): Testimonial {
  const found = TESTIMONIALS.find((testimonial) => testimonial.id === id);
  if (!found) {
    throw new Error(`Unknown testimonial id: ${id}`);
  }
  return found;
}
```

Both logos' dimensions are the verified intrinsic sizes — `ud.png` is 185×111 and `dss-logo.png` is 400×340, confirmed with `sips`. They differ; do not normalise them to a single pair. `next/image` needs the true intrinsic ratio or the logo renders distorted.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- testimonials`
Expected: PASS, 5 tests.

- [ ] **Step 5: Refactor `ContactSection` to consume the module**

In `src/components/home/ContactSection.tsx`, delete the local `TESTIMONIAL` const (lines 6-14) and add:

```tsx
import { getTestimonial } from "@/lib/testimonials";

const TESTIMONIAL = getTestimonial("deleon");
```

Every existing `TESTIMONIAL.*` reference in the file keeps working unchanged — the shape is identical minus `rating`. If the JSX references `TESTIMONIAL.rating` anywhere, delete that markup; the spec drops ratings.

- [ ] **Step 6: Verify build and tests**

Run: `npm test && npm run build`
Expected: both exit 0.

- [ ] **Step 7: Confirm the home page testimonial is visually unchanged**

Run `npm run dev` and check `http://localhost:3000/#contact`. Same quote, same logo, same layout. Pure refactor.

- [ ] **Step 8: Commit**

```bash
git add src/lib/testimonials.ts src/lib/testimonials.test.ts src/components/home/ContactSection.tsx
git commit -m "Move testimonial copy into one module both pages read"
```

---

### Task 4: Drop the GitLab social link

**Files:**
- Modify: `src/lib/siteLinks.ts:15`
- Modify: `src/lib/siteLinks.test.ts`

**Interfaces:**
- Consumes: Task 1's test harness.
- Produces: `SOCIAL_LINKS` with two entries — `linkedin`, `github`. Both `/contact` and the footer map over this array and pick up the change for free.

`GitLabIcon` in `src/components/footer/icons.tsx:30` stays. It costs nothing and five project case studies still link GitLab repos — migrating those is explicitly out of scope in the spec.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/siteLinks.test.ts`:

```ts
  it("no longer surfaces GitLab", () => {
    const ids = SOCIAL_LINKS.map((link) => link.id);
    expect(ids).not.toContain("gitlab");
    expect(ids).toEqual(["linkedin", "github"]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- siteLinks`
Expected: FAIL — received array contains `"gitlab"`.

- [ ] **Step 3: Remove the entry**

In `src/lib/siteLinks.ts`, delete line 15:

```ts
  { id: "gitlab", label: "GitLab", href: "https://gitlab.com/bklep" },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- siteLinks`
Expected: PASS.

- [ ] **Step 5: Verify the footer still type-checks**

The footer maps `SocialId` to icon components. Removing an id narrows the union; if the icon map is typed as `Record<SocialId, ...>` it still compiles with an extra key only if the type allows it.

Run: `npm run build`
Expected: exit 0. If it fails in `src/components/footer/icons.tsx` with an excess-property or missing-key error, keep `GitLabIcon` defined but remove `gitlab` from the exported map object.

- [ ] **Step 6: Confirm the footer and contact page render two links**

Run `npm run dev`, check the footer on any page and `http://localhost:3000/contact`. LinkedIn and GitHub only.

- [ ] **Step 7: Commit**

```bash
git add src/lib/siteLinks.ts src/lib/siteLinks.test.ts src/components/footer/icons.tsx
git commit -m "Surface GitHub instead of GitLab in social links"
```

---

### Task 5: `Timeline` component

**Files:**
- Create: `src/components/about/Timeline.tsx`
- Create: `src/components/about/Timeline.module.css`
- Create: `src/components/about/Timeline.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Timeline`, a named export taking no props. Owns its `ROLES` const internally. Renders an `<ol>`; each entry is an `<li>` with an `<h3>` employer, the title, and a `<time>`-free date range string (the ranges are approximate months, not machine-readable instants).

- [ ] **Step 1: Write the failing test**

Create `src/components/about/Timeline.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { Timeline } from "@/components/about/Timeline";

describe("Timeline", () => {
  it("lists all four roles, most recent first", () => {
    render(<Timeline />);
    const employers = screen.getAllByRole("heading", { level: 3 });
    expect(employers.map((h) => h.textContent)).toEqual([
      "BuildOn Technologies",
      "Gulf Winds International",
      "Bouncing Pixel",
      "WealthGuard Insurance Group",
    ]);
  });

  it("renders as an ordered list", () => {
    const { container } = render(<Timeline />);
    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(4);
  });

  it("titles every role Software Engineer", () => {
    render(<Timeline />);
    expect(screen.getAllByText("Software Engineer")).toHaveLength(4);
  });

  it("shows each date range", () => {
    render(<Timeline />);
    expect(screen.getByText("Nov 2025 — Sep 2026")).toBeInTheDocument();
    expect(screen.getByText("May 2024 — Jun 2025")).toBeInTheDocument();
    expect(screen.getByText("Feb 2022 — Apr 2024")).toBeInTheDocument();
    expect(screen.getByText("Jul 2021 — Feb 2022")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- Timeline`
Expected: FAIL — "Failed to resolve import '@/components/about/Timeline'".

- [ ] **Step 3: Create the component**

`src/components/about/Timeline.tsx`. The `description` field is declared and left unset on every entry — the spec ships without per-role copy because none was supplied, and inventing responsibilities for a real employment history is not acceptable. The field exists so copy drops in later without a layout change.

```tsx
import styles from "./Timeline.module.css";

type Role = {
  employer: string;
  title: string;
  dates: string;
  description?: string;
};

const ROLES: readonly Role[] = [
  {
    employer: "BuildOn Technologies",
    title: "Software Engineer",
    dates: "Nov 2025 — Sep 2026",
  },
  {
    employer: "Gulf Winds International",
    title: "Software Engineer",
    dates: "May 2024 — Jun 2025",
  },
  {
    employer: "Bouncing Pixel",
    title: "Software Engineer",
    dates: "Feb 2022 — Apr 2024",
  },
  {
    employer: "WealthGuard Insurance Group",
    title: "Software Engineer",
    dates: "Jul 2021 — Feb 2022",
  },
];

export function Timeline() {
  return (
    <ol className={styles.list}>
      {ROLES.map((role) => (
        <li key={role.employer} className={styles.item}>
          <span className={styles.node} aria-hidden="true" />
          <p className={styles.dates}>{role.dates}</p>
          <h3 className={styles.employer}>{role.employer}</h3>
          <p className={styles.title}>{role.title}</p>
          {role.description ? (
            <p className={styles.description}>{role.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Create the stylesheet**

`src/components/about/Timeline.module.css`. The `.dates` treatment mirrors the existing `.subheading` at `src/app/about/page.module.css:93-102`:

```css
.list {
  list-style: none;
  position: relative;
  margin: 0;
  padding: 0;
}

.list::before {
  content: "";
  position: absolute;
  top: 0.5rem;
  bottom: 0.5rem;
  left: 0.1875rem;
  width: 1px;
  background: linear-gradient(
    to bottom,
    rgba(0, 240, 255, 0.4),
    rgba(0, 240, 255, 0.05)
  );
}

.item {
  position: relative;
  padding-left: 1.75rem;
}

.item + .item {
  margin-top: 2rem;
}

.node {
  position: absolute;
  left: 0;
  top: 0.45rem;
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  background-color: var(--neon-turquoise, #00f0ff);
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.6);
}

.dates {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.44);
}

.employer {
  margin-top: 0.375rem;
  font-size: 1.0625rem;
  font-weight: 600;
  color: #ffffff;
}

.title {
  margin-top: 0.125rem;
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.62);
}

.description {
  margin-top: 0.5rem;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.62);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- Timeline`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/about/Timeline.tsx src/components/about/Timeline.module.css src/components/about/Timeline.test.tsx
git commit -m "Add the about-page role timeline"
```

---

### Task 6: `TechStack` component

**Files:**
- Create: `src/components/about/TechStack.tsx`
- Create: `src/components/about/TechStack.module.css`
- Create: `src/components/about/TechStack.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `TechStack`, a named export taking no props. Owns its `GROUPS` const. Renders five labelled groups as `<dl>` pairs, each technology a text chip. No icons — this is what keeps `react-icons` out of the project.

- [ ] **Step 1: Write the failing test**

Create `src/components/about/TechStack.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { TechStack } from "@/components/about/TechStack";

describe("TechStack", () => {
  it("renders all fifteen technologies", () => {
    const { container } = render(<TechStack />);
    expect(container.querySelectorAll("dd li")).toHaveLength(15);
  });

  it("groups them under five headings", () => {
    render(<TechStack />);
    for (const group of [
      "Languages",
      "Frontend",
      "Backend",
      "Data",
      "Tooling",
    ]) {
      expect(screen.getByText(group)).toBeInTheDocument();
    }
  });

  it("names the technologies the spec lists", () => {
    render(<TechStack />);
    for (const tech of ["TypeScript", "React", "Next.js", "C#", ".NET", "PostgreSQL"]) {
      expect(screen.getByText(tech)).toBeInTheDocument();
    }
  });

  it("renders no images", () => {
    const { container } = render(<TechStack />);
    expect(container.querySelectorAll("img, svg")).toHaveLength(0);
  });
});
```

The last assertion enforces the no-icons decision structurally.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- TechStack`
Expected: FAIL — "Failed to resolve import '@/components/about/TechStack'".

- [ ] **Step 3: Create the component**

```tsx
import styles from "./TechStack.module.css";

type Group = {
  label: string;
  items: readonly string[];
};

const GROUPS: readonly Group[] = [
  { label: "Languages", items: ["TypeScript", "JavaScript", "C#", "HTML", "CSS"] },
  { label: "Frontend", items: ["React", "Next.js", "Redux"] },
  { label: "Backend", items: ["Node.js", "Express", ".NET"] },
  { label: "Data", items: ["PostgreSQL", "MongoDB"] },
  { label: "Tooling", items: ["Git", "Heroku"] },
];

export function TechStack() {
  return (
    <dl className={styles.groups}>
      {GROUPS.map((group) => (
        <div key={group.label} className={styles.group}>
          <dt className={styles.label}>{group.label}</dt>
          <dd>
            <ul className={styles.chips}>
              {group.items.map((item) => (
                <li key={item} className={styles.chip}>
                  {item}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 4: Create the stylesheet**

```css
.groups {
  display: grid;
  gap: 1.5rem;
}

.group {
  display: grid;
  gap: 0.625rem;
}

.label {
  font-family: var(--font-mono, monospace);
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.44);
}

.chips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.chip {
  padding: 0.3125rem 0.6875rem;
  border: 1px solid rgba(0, 240, 255, 0.22);
  border-radius: 0.375rem;
  background-color: rgba(0, 240, 255, 0.04);
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.82);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- TechStack`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/about/TechStack.tsx src/components/about/TechStack.module.css src/components/about/TechStack.test.tsx
git commit -m "Add the grouped technology stack"
```

---

### Task 7: `Testimonials` component

**Files:**
- Create: `src/components/about/Testimonials.tsx`
- Create: `src/components/about/Testimonials.module.css`
- Create: `src/components/about/Testimonials.test.tsx`

**Interfaces:**
- Consumes: `TESTIMONIALS` from `@/lib/testimonials` (Task 3).
- Produces: `Testimonials`, a named export taking no props. Renders every entry in `TESTIMONIALS` as a `<figure>` with `<blockquote>` + `<figcaption>`. Client logos are decorative (`alt=""`) because the company name sits adjacent in text.

- [ ] **Step 1: Write the failing test**

Create `src/components/about/Testimonials.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { Testimonials } from "@/components/about/Testimonials";

describe("Testimonials", () => {
  it("renders both testimonials as figures", () => {
    const { container } = render(<Testimonials />);
    expect(container.querySelectorAll("figure")).toHaveLength(2);
    expect(container.querySelectorAll("blockquote")).toHaveLength(2);
  });

  it("attributes each quote to a person, title, and company", () => {
    render(<Testimonials />);
    expect(screen.getByText("Xavier Chavaria")).toBeInTheDocument();
    expect(screen.getByText("Owner/Operator")).toBeInTheDocument();
    expect(screen.getByText("Ultra Demolition")).toBeInTheDocument();
    expect(screen.getByText("Martha DeLeon")).toBeInTheDocument();
    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("DeLeon Safety Solutions")).toBeInTheDocument();
  });

  it("marks client logos decorative", () => {
    const { container } = render(<Testimonials />);
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image.getAttribute("alt")).toBe("");
    }
  });

  it("renders no star rating", () => {
    render(<Testimonials />);
    expect(screen.queryByText(/out of 5/i)).toBeNull();
    expect(screen.queryByText("★")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- about/Testimonials`
Expected: FAIL — "Failed to resolve import '@/components/about/Testimonials'".

- [ ] **Step 3: Create the component**

```tsx
import Image from "next/image";
import { TESTIMONIALS } from "@/lib/testimonials";
import styles from "./Testimonials.module.css";

export function Testimonials() {
  return (
    <div className={styles.list}>
      {TESTIMONIALS.map((testimonial) => (
        <figure key={testimonial.id} className={styles.card}>
          <blockquote className={styles.quote}>
            {testimonial.quote}
          </blockquote>
          <figcaption className={styles.attribution}>
            <Image
              className={styles.logo}
              src={testimonial.logo.src}
              alt=""
              width={testimonial.logo.width}
              height={testimonial.logo.height}
            />
            <span>
              <span className={styles.name}>{testimonial.name}</span>
              <span className={styles.role}>{testimonial.title}</span>
              <span className={styles.company}>{testimonial.company}</span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
```

Title and company are **separate elements on purpose.** Combining them into one node as `"Owner/Operator, Ultra Demolition"` fails the test's exact-match `getByText("Ultra Demolition")`. If you find yourself reaching for a substring matcher to make the test pass, split the elements instead — the assertion is correct as written.

- [ ] **Step 4: Create the stylesheet**

```css
.list {
  display: grid;
  gap: 1.25rem;
}

.card {
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  background-color: #12161f;
}

.quote {
  font-size: 1rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.82);
}

.quote::before {
  content: "\201C";
  color: var(--neon-turquoise, #00f0ff);
}

.quote::after {
  content: "\201D";
  color: var(--neon-turquoise, #00f0ff);
}

.attribution {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.logo {
  flex: none;
  width: auto;
  height: 2.25rem;
  object-fit: contain;
}

.name {
  display: block;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #ffffff;
}

.role,
.company {
  display: block;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.55);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- about/Testimonials`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/about/Testimonials.tsx src/components/about/Testimonials.module.css src/components/about/Testimonials.test.tsx
git commit -m "Surface both testimonials instead of tabbing them away"
```

---

### Task 8: Assemble the page

**Files:**
- Modify: `src/app/about/page.tsx` (full rewrite)
- Modify: `src/app/about/page.module.css` (full rewrite)
- Create: `src/app/about/page.test.tsx`

**Interfaces:**
- Consumes: `AvailabilityStatus` (Task 2), `Timeline` (Task 5), `TechStack` (Task 6), `Testimonials` (Task 7), plus `EMAIL`, `RESUME_URL`, `SOCIAL_LINKS` from `@/lib/siteLinks`.
- Produces: the `/about` route. Nothing depends on it.

- [ ] **Step 1: Write the failing test**

Create `src/app/about/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";

describe("AboutPage", () => {
  it("has exactly one h1", () => {
    render(<AboutPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("states availability", () => {
    render(<AboutPage />);
    expect(screen.getByText("Available for work")).toBeInTheDocument();
  });

  it("links the resume in a new tab", () => {
    render(<AboutPage />);
    const resume = screen.getByRole("link", { name: /resume/i });
    expect(resume).toHaveAttribute(
      "href",
      "/images/documents/samuel-klepper-resume.pdf",
    );
    expect(resume).toHaveAttribute("target", "_blank");
    expect(resume).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the timeline, stack, and both testimonials in page source", () => {
    const { container } = render(<AboutPage />);
    expect(container.querySelectorAll("ol li")).toHaveLength(4);
    expect(container.querySelectorAll("dd li")).toHaveLength(15);
    expect(container.querySelectorAll("blockquote")).toHaveLength(2);
  });

  it("exposes no tabs or other interaction gating content", () => {
    render(<AboutPage />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
```

That last test is the point of the whole rebuild — it fails if anyone reintroduces the old tab pattern.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- about/page`
Expected: FAIL — the current stub has no availability status and no timeline.

- [ ] **Step 3: Rewrite `src/app/about/page.tsx`**

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Testimonials } from "@/components/about/Testimonials";
import { TechStack } from "@/components/about/TechStack";
import { Timeline } from "@/components/about/Timeline";
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
import { RESUME_URL, SOCIAL_LINKS } from "@/lib/siteLinks";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About — Sam Klepper",
  description:
    "Software engineer in Houston, TX — TypeScript, React, and C#. Five years building sites and applications for small businesses.",
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>
      <h1 className={styles.heading}>About</h1>

      <div className={styles.inner}>
        <aside className={styles.rail}>
          <div className={styles.portrait}>
            <Image
              src="/images/sam3-cr.jpg"
              alt="Sam Klepper"
              fill
              className={styles.portraitImage}
              sizes="(min-width: 900px) 18rem, 70vw"
            />
          </div>

          <p className={styles.name}>Sam Klepper</p>
          <p className={styles.role}>Software Engineer</p>

          <AvailabilityStatus className={styles.status} />

          <div className={styles.actions}>
            <a
              className={styles.resume}
              href={RESUME_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Resume
            </a>
            <Link className={styles.contact} href="/contact">
              Contact
            </Link>
          </div>

          <ul className={styles.socials}>
            {SOCIAL_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  className={styles.social}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.body}>
          <section className={styles.block}>
            <h2 className={styles.subheading}>Background</h2>
            <p className={styles.copy}>
              I&rsquo;m a developer in Houston, TX. I started out chasing a
              graphic design degree and found software somewhere along the way
              &mdash; the part I liked was never the picture, it was making the
              thing work.
            </p>
            <p className={styles.copy}>
              Since graduating from DigitalCrafts in March 2020, I&rsquo;ve
              spent five years building sites and applications, first for small
              businesses getting online for the first time and since for
              logistics, insurance, and agency teams. The through-line is the
              same either way: understand the business first, then build only
              what serves it.
            </p>
          </section>

          <section className={styles.block}>
            <h2 className={styles.subheading}>Experience</h2>
            <Timeline />
          </section>

          <section className={styles.block}>
            <h2 className={styles.subheading}>Stack</h2>
            <TechStack />
          </section>

          <section className={styles.block}>
            <h2 className={styles.subheading}>What clients say</h2>
            <Testimonials />
          </section>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Rewrite `src/app/about/page.module.css`**

```css
.page {
  margin: 0 auto;
  max-width: 68rem;
  padding: 6rem 2rem 8rem;
}

.back {
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  transition: color 200ms ease;
}

.back:hover,
.back:focus-visible {
  color: var(--neon-turquoise, #00f0ff);
}

.heading {
  margin-top: 1.5rem;
  margin-bottom: 3rem;
  font-size: 2.5rem;
  font-weight: 600;
  color: #ffffff;
}

.inner {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  align-items: flex-start;
}

@media (min-width: 900px) {
  .inner {
    flex-direction: row;
    gap: 4rem;
  }
}

.rail {
  width: 100%;
}

@media (min-width: 900px) {
  .rail {
    position: sticky;
    top: 6rem;
    flex: none;
    width: 18rem;
  }
}

.portrait {
  position: relative;
  width: min(16rem, 60vw);
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  background-color: #12161f;
  box-shadow: 0 0 3rem -1rem rgba(176, 38, 255, 0.55);
}

@media (min-width: 900px) {
  .portrait {
    width: 100%;
  }
}

.portrait::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(0, 240, 255, 0.22),
    inset 0 -3rem 4rem -2rem rgba(11, 14, 20, 0.8);
  pointer-events: none;
}

.portraitImage {
  object-fit: cover;
  object-position: center top;
}

.name {
  margin-top: 1.25rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
}

.role {
  margin-top: 0.125rem;
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.62);
}

.status {
  margin-top: 1rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.resume,
.contact {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 200ms ease, border-color 200ms ease,
    color 200ms ease;
}

.resume {
  border: 1px solid transparent;
  background-color: var(--neon-pink, #ff2e97);
  color: #0b0e14;
}

.resume:hover,
.resume:focus-visible {
  background-color: #ff56ac;
}

.contact {
  border: 1px solid rgba(0, 240, 255, 0.35);
  color: var(--neon-turquoise, #00f0ff);
}

.contact:hover,
.contact:focus-visible {
  background-color: rgba(0, 240, 255, 0.08);
  border-color: rgba(0, 240, 255, 0.6);
}

.socials {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-top: 1.75rem;
  padding: 0;
}

.social {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.5);
  transition: color 200ms ease;
}

.social:hover,
.social:focus-visible {
  color: var(--neon-turquoise, #00f0ff);
}

.body {
  flex: 1;
  min-width: 0;
}

.block + .block {
  margin-top: 3.5rem;
}

.subheading {
  margin-bottom: 1.25rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--neon-turquoise, #00f0ff);
}

.copy {
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.72);
}

.copy + .copy {
  margin-top: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .back,
  .resume,
  .contact,
  .social {
    transition: none;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- about/page`
Expected: PASS, 5 tests.

- [ ] **Step 6: Run the whole suite and the build**

Run: `npm test && npm run build`
Expected: both exit 0, lint clean.

- [ ] **Step 7: Verify the layout at every breakpoint**

Run `npm run dev` and open `http://localhost:3000/about`. Check at **320px, 768px, 900px, and 1440px**:

- Below 900px the rail stacks above the content and is not sticky.
- At and above 900px the rail sticks while the right column scrolls, and the résumé button stays visible the whole way down.
- The rail never overlaps the footer or gets clipped.
- Nothing scrolls horizontally at 320px.

- [ ] **Step 8: Verify tab order and reduced motion**

Tab from the top of the page: Home → rail links (résumé, contact, socials) → any links in the body. Focus must be visible on every stop and must not be trapped in the sticky rail.

Then enable reduced motion (macOS: System Settings → Accessibility → Display → Reduce motion) and confirm no transitions fire on hover.

- [ ] **Step 9: Commit**

```bash
git add src/app/about/page.tsx src/app/about/page.module.css src/app/about/page.test.tsx
git commit -m "Rebuild /about as a sticky dossier"
```

---

## Self-Review Notes

Checked against the spec:

- Sticky rail, four content blocks, accent discipline, no motion, no new runtime deps, no DB changes — Tasks 5–8.
- `AvailabilityStatus` extraction with all three call sites — Task 2.
- `src/lib/testimonials.ts` shared module — Task 3.
- GitLab removal — Task 4.
- Success criteria 1–8 all have a covering assertion or a named manual check.

Deliberately **not** covered, matching the spec's out-of-scope section: per-role descriptions (field exists, unset), the Mar 2020 – Jul 2021 gap (unlabeled), migrating project `repo:` links off GitLab, and any third testimonial.

Three defects found in a pre-flight pass and corrected in place before execution:

1. **Task 3** gave `ud.png` as 400×340, copied from `dss-logo.png`. Its real intrinsic size is
   **185×111**; the wrong pair would have rendered the Ultra Demolition logo distorted. Both
   logos now carry their verified `sips` dimensions, and the plan says explicitly not to
   normalise them to one pair.
2. **Task 2** assumed `ContactSection.module.css` `.status` carried a `margin-bottom`. It does
   not — spacing comes from the `.aside` flow. That call site now passes no `className` and
   deletes its rules outright; only the contact page keeps a spacing class.
3. **Task 7** listed component code that failed its own test (title and company in one node
   versus an exact-match `getByText`). The listing is now correct as written.
