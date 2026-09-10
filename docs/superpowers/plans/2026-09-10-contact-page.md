# /contact Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/contact` as a full-bleed two-column split — contact details and proof on a
tinted dot-field panel, the existing contact form beside it — so the page is no longer weaker
than the contact section already on the home page.

**Architecture:** A new `ContactMethods` component renders the email/location definition list
with inline SVG icons. `src/app/contact/page.tsx` composes it with the existing
`AvailabilityStatus`, `ContactForm`, and testimonial data into a two-column grid. All layout is
CSS Modules; the left panel bleeds to the viewport edge using the reference's `position: static`
trick, and its texture is a pure-CSS dot matrix.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS Modules, Vitest +
@testing-library/react.

## Global Constraints

- **CSS Modules only. Never Tailwind.** No `@tailwind` directives, no `tailwind.config.ts`, no
  postcss/autoprefixer.
- **No new dependencies.** Icons are hand-written inline SVG. `@heroicons/react` is not
  installed and is not being added.
- **No grid-floor backgrounds** (banned in `CLAUDE.md`). The texture is a dot matrix.
- **Accent discipline:** `#00F0FF` turquoise dominates. `#FF2E97` pink appears only on the
  form's submit button (already styled in `ContactForm.module.css`). `#B026FF` purple is
  gradients and glow only. `#39FF88` green appears only inside `AvailabilityStatus`.
- Background `#0B0E14`; card/surface `#12161F`.
- **No phone number anywhere on the page.** This is a deliberate decision, not an omission —
  Task 1 includes a test that locks it in.
- **Do not modify** `ContactForm`, `src/app/actions/contact.ts`, `src/db/schema.ts`, or
  `src/components/home/ContactSection.tsx`.
- Reply-time copy must read "two business days", matching the form's success toast at
  `src/components/home/ContactForm.tsx:80`.

**Spec:** `docs/superpowers/specs/2026-09-10-contact-page-design.md`

**Commands:** `npm run test` (vitest run) · `npm run build` (type-checks + lints) · `npm run dev`

---

### Task 1: ContactMethods component

The email/location definition list with inline icons. Self-contained and unit-testable with no
page or layout dependencies.

**Files:**
- Modify: `src/lib/siteLinks.ts` (append one constant)
- Create: `src/components/contact/ContactMethods.tsx`
- Create: `src/components/contact/ContactMethods.module.css`
- Test: `src/components/contact/ContactMethods.test.tsx`

**Interfaces:**
- Consumes: `EMAIL` from `@/lib/siteLinks` (already exists, value `"hello@samklep.dev"`).
- Produces: `LOCATION` exported from `@/lib/siteLinks` (value `"Houston, TX"`), and a named
  export `ContactMethods` — `() => JSX.Element`, no props. Task 2 imports both.

- [ ] **Step 1: Write the failing test**

Create `src/components/contact/ContactMethods.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { EMAIL, LOCATION } from "@/lib/siteLinks";
import { ContactMethods } from "./ContactMethods";

describe("ContactMethods", () => {
  it("links the email address", () => {
    render(<ContactMethods />);
    const link = screen.getByRole("link", { name: EMAIL });
    expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
  });

  it("renders the location as plain text, not a link", () => {
    render(<ContactMethods />);
    expect(screen.getByText(LOCATION)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: LOCATION })).toBeNull();
  });

  it("labels each row for screen readers and hides the icons from them", () => {
    const { container } = render(<ContactMethods />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
  });

  it("publishes no phone number", () => {
    const { container } = render(<ContactMethods />);
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/contact/ContactMethods.test.tsx`
Expected: FAIL — `Failed to resolve import "./ContactMethods"`.

- [ ] **Step 3: Add the LOCATION constant**

Append to `src/lib/siteLinks.ts`, below the existing `EMAIL` export on line 21:

```ts
export const LOCATION = "Houston, TX";
```

- [ ] **Step 4: Write the component**

Create `src/components/contact/ContactMethods.tsx`. The `<dt>` carries a visually hidden text
label plus an `aria-hidden` icon — the icon is decoration, the label is what a screen reader
announces:

```tsx
import { EMAIL, LOCATION } from "@/lib/siteLinks";
import styles from "./ContactMethods.module.css";

function EnvelopeIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
      />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  );
}

export function ContactMethods() {
  return (
    <dl className={styles.list}>
      <div className={styles.row}>
        <dt className={styles.term}>
          <span className={styles.srOnly}>Email</span>
          <EnvelopeIcon />
        </dt>
        <dd className={styles.detail}>
          <a className={styles.link} href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
        </dd>
      </div>

      <div className={styles.row}>
        <dt className={styles.term}>
          <span className={styles.srOnly}>Location</span>
          <MapPinIcon />
        </dt>
        <dd className={styles.detail}>{LOCATION}</dd>
      </div>
    </dl>
  );
}
```

- [ ] **Step 5: Write the stylesheet**

Create `src/components/contact/ContactMethods.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.term {
  flex: none;
  line-height: 1;
}

.icon {
  width: 1.25rem;
  height: 1.5rem;
  color: rgba(255, 255, 255, 0.4);
}

.detail {
  margin: 0;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.72);
}

.link {
  color: rgba(255, 255, 255, 0.72);
  transition: color 200ms ease;
}

.link:hover,
.link:focus-visible {
  color: var(--neon-turquoise, #00f0ff);
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/contact/ContactMethods.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/siteLinks.ts src/components/contact/
git commit -m "Add ContactMethods component for the contact page"
```

---

### Task 2: Rebuild the /contact page

Replaces the centred single-panel stub with the full page structure and baseline
single-column styling. The two-column split lands in Task 3, so the page is correct and
readable after this task — just stacked.

**Files:**
- Modify: `src/app/contact/page.tsx` (full rewrite, currently 60 lines)
- Modify: `src/app/contact/page.module.css` (full rewrite, currently 154 lines)
- Test: `src/app/contact/page.test.tsx` (create)

**Interfaces:**
- Consumes: `ContactMethods` and `LOCATION` from Task 1; `ContactForm` from
  `@/components/home/ContactForm`; `AvailabilityStatus` from `@/components/ui/AvailabilityStatus`;
  `getTestimonial` from `@/lib/testimonials`; `RESUME_URL`, `SOCIAL_LINKS` from `@/lib/siteLinks`.
- Produces: the `.page` / `.grid` / `.introColumn` / `.introInner` / `.formColumn` class names
  that Task 3's media query targets, and an empty `.panel` element inside `.introColumn` that
  Task 3 fills in.

> **Trap — the page test must mock the server action.** `ContactForm` imports `submitContact`
> from `@/app/actions/contact`, which imports `@/db`, and `src/db/index.ts:6-8` **throws at
> module load** when `DATABASE_URL` is unset and opens a real postgres socket pool when it is.
> Rendering the page in jsdom therefore fails or leaks a connection unless the action module is
> mocked. `/about` has no client components, so no existing test hits this. `vi.mock` is hoisted
> above the imports by Vitest, so its placement in the file below is correct as written.

- [ ] **Step 1: Write the failing test**

Create `src/app/contact/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { EMAIL, LOCATION } from "@/lib/siteLinks";

vi.mock("@/app/actions/contact", () => ({
  submitContact: vi.fn(),
}));

import ContactPage from "@/app/contact/page";

describe("ContactPage", () => {
  it("has exactly one h1", () => {
    render(<ContactPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Get in touch" }),
    ).toBeInTheDocument();
  });

  it("states availability", () => {
    render(<ContactPage />);
    expect(screen.getByText("Available for work")).toBeInTheDocument();
  });

  it("renders the contact methods", () => {
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: EMAIL })).toHaveAttribute(
      "href",
      `mailto:${EMAIL}`,
    );
    expect(screen.getByText(LOCATION)).toBeInTheDocument();
  });

  it("links home, the socials, and the resume", () => {
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();

    const resume = screen.getByRole("link", { name: /resume/i });
    expect(resume).toHaveAttribute(
      "href",
      "/images/documents/samuel-klepper-resume.pdf",
    );
    expect(resume).toHaveAttribute("target", "_blank");
    expect(resume).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the Ultra Demolition testimonial, not the one on the home page", () => {
    render(<ContactPage />);
    expect(screen.getByText("Xavier Chavaria")).toBeInTheDocument();
    expect(screen.queryByText("Martha DeLeon")).toBeNull();
  });

  it("renders the contact form fields", () => {
    render(<ContactPage />);
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Budget/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Website/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Message/)).toBeInTheDocument();
  });

  it("publishes no phone number", () => {
    const { container } = render(<ContactPage />);
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/contact/page.test.tsx`
Expected: FAIL — the current page renders `<h1>Contact</h1>`, so the "Get in touch" assertion
fails, as do the contact-method, testimonial, and form-field assertions.

- [ ] **Step 3: Rewrite the page**

Replace the entire contents of `src/app/contact/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactMethods } from "@/components/contact/ContactMethods";
import { ContactForm } from "@/components/home/ContactForm";
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
import { RESUME_URL, SOCIAL_LINKS } from "@/lib/siteLinks";
import { getTestimonial } from "@/lib/testimonials";
import styles from "./page.module.css";

const TESTIMONIAL = getTestimonial("ultra");

export const metadata: Metadata = {
  title: "Contact — Sam Klepper",
  description:
    "Start a project with Sam Klepper — full-stack developer in Houston, TX. Tell me what you're building and I'll reply within two business days.",
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <div className={styles.grid}>
        <div className={styles.introColumn}>
          <div className={styles.panel} aria-hidden="true" />

          <div className={styles.introInner}>
            <Link href="/" className={styles.back}>
              <span aria-hidden="true">←</span> Home
            </Link>

            <h1 className={styles.heading}>Get in touch</h1>

            <p className={styles.intro}>
              Tell me what you&rsquo;re building, roughly what you&rsquo;re
              working with, and when you need it. I read every message and
              reply within two business days.
            </p>

            <AvailabilityStatus className={styles.status} />

            <ContactMethods />

            <ul className={styles.links} role="list">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    className={styles.link}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  className={styles.link}
                  href={RESUME_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resume
                </a>
              </li>
            </ul>

            <figure className={styles.testimonial}>
              <Image
                className={styles.testimonialLogo}
                src={TESTIMONIAL.logo.src}
                alt={TESTIMONIAL.company}
                width={TESTIMONIAL.logo.width}
                height={TESTIMONIAL.logo.height}
                sizes="140px"
              />

              <p
                className={styles.rating}
                role="img"
                aria-label={`${TESTIMONIAL.rating} out of 5 stars`}
              >
                <span aria-hidden="true">{"★".repeat(TESTIMONIAL.rating)}</span>
              </p>

              <blockquote className={styles.quote}>
                <p>&ldquo;{TESTIMONIAL.quote}&rdquo;</p>
              </blockquote>

              <figcaption className={styles.attribution}>
                <span className={styles.attributionName}>
                  {TESTIMONIAL.name}
                </span>
                <span className={styles.attributionRole}>
                  {TESTIMONIAL.title}, {TESTIMONIAL.company}
                </span>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className={styles.formColumn}>
          <div className={styles.formInner}>
            <ContactForm />
          </div>
        </div>
      </div>
    </main>
  );
}
```

Note the résumé link uses `target="_blank"` rather than the stub's `download`, matching
`/about` (`src/app/about/page.tsx:44-50`).

- [ ] **Step 4: Rewrite the stylesheet (baseline, single column)**

Replace the entire contents of `src/app/contact/page.module.css`. `.panel` is declared here but
left empty — Task 3 fills it:

```css
.page {
  position: relative;
  isolation: isolate;
}

.grid {
  margin: 0 auto;
  max-width: 80rem;
  display: grid;
  grid-template-columns: 1fr;
}

.introColumn {
  position: relative;
  padding: 6rem 1.5rem 4rem;
}

.introInner {
  margin: 0 auto;
  max-width: 36rem;
}

.panel {
  /* Task 3: bleeding dot-field background */
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
  font-size: clamp(2.5rem, 5vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.intro {
  margin-top: 1.5rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.6);
}

.status {
  margin-top: 2rem;
}

.links {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-top: 2rem;
  padding: 0;
}

.link {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.5);
  transition: color 200ms ease;
}

.link:hover,
.link:focus-visible {
  color: var(--neon-turquoise, #00f0ff);
}

.testimonial {
  margin: 3rem 0 0;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.testimonialLogo {
  height: 3.25rem;
  width: auto;
  max-width: 10rem;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.7;
}

.rating {
  margin-top: 1.25rem;
  font-size: 0.875rem;
  letter-spacing: 0.15em;
  color: var(--neon-turquoise, #00f0ff);
}

.quote {
  margin: 0.75rem 0 0;
  font-size: 1.0625rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.82);
}

.attribution {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin-top: 1.25rem;
}

.attributionName {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #ffffff;
}

.attributionRole {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}

.formColumn {
  padding: 4rem 1.5rem 6rem;
}

.formInner {
  margin: 0 auto;
  max-width: 36rem;
}
```

The `filter: brightness(0) invert(1)` on the logo is required, not cosmetic — the source PNGs
are dark artwork that is invisible on a dark surface. See the client-logo-band spec.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/app/contact/page.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 6: Verify the full suite and the build**

Run: `npm run test && npm run build`
Expected: all test files pass; build completes with `/contact` listed as a static route.

- [ ] **Step 7: Commit**

```bash
git add src/app/contact/
git commit -m "Rebuild /contact with the contact form, methods, and testimonial"
```

---

### Task 3: Split layout with bleeding dot field

Turns the stacked page into the two-column split and adds the panel texture. No new markup —
this task is entirely `page.module.css`.

**Files:**
- Modify: `src/app/contact/page.module.css` (fill in `.panel`, add `.dots` / `.glow`, add the
  `1024px` media query)
- Modify: `src/app/contact/page.tsx` (add the two children of `.panel`)

**Interfaces:**
- Consumes: the class names produced by Task 2.
- Produces: nothing other tasks depend on. This is the final task.

> **Trap — the bleed depends on `position: static`.** At `1024px` the left column is switched to
> `position: static` so it stops being a containing block. The absolutely positioned `.panel`
> inside it then resolves against `.page` instead, and `left: 0; width: 50%` becomes half the
> **viewport** rather than half the column. Changing `.introColumn` back to `position: relative`
> at that breakpoint silently reverts the panel to a half-width block floating inside the column.
> This looks like a redundant declaration and is not.

- [ ] **Step 1: Add the panel's two children**

In `src/app/contact/page.tsx`, replace the self-closing panel element:

```tsx
          <div className={styles.panel} aria-hidden="true" />
```

with:

```tsx
          <div className={styles.panel} aria-hidden="true">
            <div className={styles.dots} />
            <div className={styles.glow} />
          </div>
```

- [ ] **Step 2: Fill in the panel styles**

In `src/app/contact/page.module.css`, replace the placeholder `.panel` block:

```css
.panel {
  /* Task 3: bleeding dot-field background */
}
```

with:

```css
.panel {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: -1;
  width: 100%;
  overflow: hidden;
  background-color: #12161f;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.16) 1px,
    transparent 1px
  );
  background-size: 28px 28px;
  -webkit-mask-image: radial-gradient(
    100% 100% at top right,
    #000000,
    transparent
  );
  mask-image: radial-gradient(100% 100% at top right, #000000, transparent);
}

.glow {
  position: absolute;
  top: calc(100% - 13rem);
  left: -14rem;
  width: 72rem;
  aspect-ratio: 1155 / 678;
  opacity: 0.2;
  filter: blur(64px);
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
```

- [ ] **Step 3: Add the split media query**

Append to `src/app/contact/page.module.css`:

```css
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }

  /* Load-bearing: unsets the containing block so .panel resolves against
     .page and bleeds to the viewport's left edge. Do not make this relative. */
  .introColumn {
    position: static;
    padding: 8rem 2rem;
  }

  .introInner {
    margin: 0 0 0 auto;
    max-width: 32rem;
  }

  .panel {
    width: 50%;
    border-bottom: 0;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
  }

  .glow {
    top: calc(50% - 7rem);
  }

  .formColumn {
    padding: 8rem 2rem;
  }

  .formInner {
    margin: 0 auto 0 0;
    max-width: 32rem;
  }
}
```

- [ ] **Step 4: Verify tests and build still pass**

Run: `npm run test && npm run build`
Expected: all tests pass, build succeeds. The tests assert structure, not layout, so they should
be unaffected — if any fail, the markup change in Step 1 is wrong.

- [ ] **Step 5: Verify visually**

Run: `npm run dev`, open `http://localhost:3000/contact`, and confirm:
1. At desktop width, the tinted panel runs to the **left edge of the viewport**, not to the edge
   of the centred content. If it stops short, `.introColumn` is not `position: static`.
2. The dot field fades out toward the top-right and is invisible at the bottom-left.
3. The purple→turquoise glow sits at mid-height on the left, soft and low-contrast.
4. Form fields pair up: name+email, budget+website, message full width.
5. Below 1024px the columns stack, the panel covers only the intro block and ends with a bottom
   border, and no horizontal scrollbar appears.
6. The green dot appears only in "Available for work"; the only pink is the submit button.

- [ ] **Step 6: Commit**

```bash
git add src/app/contact/
git commit -m "Split /contact into two columns with a bleeding dot-field panel"
```

---

## Verification

- [ ] `npm run test` — all files pass, including the two new test files (11 new tests).
- [ ] `npm run build` — clean type-check and lint; `/contact` prerendered as static.
- [ ] `git status` — clean. `drizzle/` untouched, `package.json` untouched (no new dependency).
- [ ] The home page's contact section still renders and submits unchanged.
