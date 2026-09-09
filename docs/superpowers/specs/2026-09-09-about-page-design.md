# /about page — design

**Date:** 2026-09-09
**Status:** approved, ready for implementation plan

## Problem

`/about` is a stub. It carries the old site's copy nearly verbatim — the bio paragraph and
the four broad "skills" lines from `portfolio-1/pages/about.tsx` — and nothing else. Meanwhile
the material that would make the page persuasive already exists and goes unused: two
attributable client testimonials, a five-year employment history, a concrete technology list,
and a résumé.

The old page had all of this and buried the best of it. Its two real testimonials sat inside a
`@headlessui` `Tab.Panel` (`portfolio-1/pages/about.tsx:322-332`), one click from view and
invisible to crawlers, while every visitor got a screen-reader-only "5 out of 5 stars" with no
quote, author, or company attached. The rebuild inverts that: the proof becomes the page.

A second constraint shapes the tone. Sam is actively job-seeking as of September 2026, so the
page serves two readers — prospective clients and prospective employers — with the employer
half weighted up and the page closing on availability rather than a project inquiry.

## Audience and priorities

Both audiences, employer-leaning. In priority order the page must:

1. Establish credibility fast (testimonials, named clients, continuous employment).
2. Make the résumé and contact path reachable from any scroll position.
3. State availability plainly.
4. Give a recruiter a scannable stack and timeline.

## Approach: sticky dossier

Two columns on desktop. A sticky left rail carries identity and calls to action; the right
column scrolls through the content blocks. On viewports below 900px the rail unsticks and
stacks above the content.

This preserves the one thing the old layout got right — identity and CTAs beside the content
rather than above it — while removing the tabs. Everything previously click-gated becomes
linear, scrollable, and indexable.

Two alternatives were considered and rejected:

- **Narrative scroll** (single column, sections stacked). Simplest, but the availability
  status and résumé button scroll away after the first screen. On a page whose job is partly
  "hire me," the primary CTA should not be a one-time event.
- **Terminal dossier** (monospace field labels, boot-up readout, timeline as log entries).
  Most distinctive, but it contradicts the standing rule in `CLAUDE.md`: "One orchestrated
  'boot-up' moment on load (the hero). Do not scatter glitch effects elsewhere."

## Layout

### Left rail

Sticky at `top: 6rem` on `min-width: 900px`. The existing `.portrait` rule in
`src/app/about/page.module.css:70-76` already establishes this pattern; the rail generalises it.

Contents, in order:

1. Portrait — `/images/sam3-cr.jpg`, existing framing, purple glow.
2. Name — "Sam Klepper".
3. Title — "Software Engineer".
4. `<AvailabilityStatus />` — see below.
5. Résumé button — pink, primary. Links `RESUME_URL`, opens in a new tab.
6. Contact link — turquoise outline, secondary. Links `/contact`.
7. Social links — from `SOCIAL_LINKS`.

### Right column

Four blocks, in order.

**Bio.** The graphic-design → DigitalCrafts → small-business arc, rewritten tighter than the
original. Same facts, fewer words; the original is one long run-on sentence carried over from
2021.

**Timeline.** Four roles, most recent first, as a vertical rule with turquoise node markers.
Dates use the mono/uppercase/letterspaced treatment already defined at
`src/app/about/page.module.css:93-102`.

| Employer | Title | Dates |
|---|---|---|
| BuildOn Technologies | Software Engineer | Nov 2025 – Sep 2026 |
| Gulf Winds International | Software Engineer | May 2024 – Jun 2025 |
| Bouncing Pixel | Software Engineer | Feb 2022 – Apr 2024 |
| WealthGuard Insurance Group | Software Engineer | Jul 2021 – Feb 2022 |

Entries render **employer, title, and dates only**. No per-role description copy ships in this
iteration — Sam supplied employers, dates, and title, but not what each role involved, and
inventing responsibilities for a real employment history is not acceptable on a portfolio. The
component accepts an optional `description` field so copy can be added later without a layout
change.

**Stack.** Fifteen technologies as text chips, grouped rather than presented as a flat wall:

- **Languages** — TypeScript, JavaScript, C#, HTML, CSS
- **Frontend** — React, Next.js, Redux
- **Backend** — Node.js, Express, .NET
- **Data** — PostgreSQL, MongoDB
- **Tooling** — Git, Heroku

No icons. Sam explicitly deselected them, and their absence keeps `react-icons` — a dependency
the old page needed for this exact block — out of the rebuild.

**Testimonials.** Two cards. Quote first, then attribution: name, title, company, and the
client logo already in `public/images/logos/`.

| Author | Title | Company | Logo |
|---|---|---|---|
| Xavier Chavaria | Owner/Operator | Ultra Demolition | `ud.png` |
| Martha DeLeon | CEO | DeLeon Safety Solutions | `dss-logo.png` |

**Star ratings are shown**, matching the home page's testimonial card. This reverses an earlier
decision in this spec to drop them; the owner chose consistent treatment sitewide.

The distinction that still matters, and the reason the old page failed: a rating must never
appear *without* the quote it belongs to. The old site rendered a screen-reader-only "5 out of
5 stars" to every visitor while the actual quotes sat behind a tab
(`portfolio-1/pages/about.tsx:322-332`) — a bare number standing in for evidence. Stars beside
an attributed quote are fine. Stars alone are not, and no aggregate rating badge goes anywhere
on this site.

Two testimonials sit in the narrower right column, where a stacked pair reads as a natural
count. A full-bleed testimonial band would look underfilled at n=2.

## Shared component: `AvailabilityStatus`

The "Available for work" pill already exists twice, each with its own duplicated CSS:

- `src/components/home/ContactSection.tsx:41` + `ContactSection.module.css:62-69`
- `src/app/contact/page.tsx:26` + `contact/page.module.css:75-82`

`src/app/toast.css:3` documents the toast theme as derived from this pill, so its appearance is
already load-bearing beyond the two call sites. Adding a third hand-rolled copy for `/about` is
how the three drift apart.

Extract `src/components/ui/AvailabilityStatus` (green dot + label) and refactor both existing
call sites to use it. This is the sanctioned use of `--neon-green`: `CLAUDE.md` reserves the
green strictly for status indicators and names "available for work" as the example.

## Data

Bio copy, timeline entries, and the technology list live in module-level constants inside the
components that render them, matching the existing `SERVICES` (`ServicesSection.tsx`) and
`CAPABILITIES` (`AboutSection.tsx`) pattern.

Testimonials are the exception — see below.

**No schema changes, no migrations, no seed changes.** This is static biographical content.
Routing it through Postgres would recreate the CMS the rebuild exists to avoid, and it is not
queryable metadata.

### Shared module: `src/lib/testimonials.ts`

The Martha DeLeon testimonial is **already rendered on the home page** —
`ContactSection.tsx:6-14` hardcodes the same quote, name, title, company, and logo this page
needs. Duplicating it into an about-page constant would create a third source of truth for
copy attributed to a real, named person, and the two would drift.

Extract both testimonials into `src/lib/testimonials.ts` alongside `siteLinks.ts`, and have
`ContactSection` and the about page both read from it. `ContactSection` continues to render
only the DeLeon entry; the about page renders both.

Consequence worth stating: Martha DeLeon's quote appears on both the home page and `/about`.
That is acceptable — they are different pages serving different readers — and is preferable to
dropping the site's only home-page social proof or padding `/about` with a third testimonial
that does not exist.

## Styling

CSS Modules only, consistent with the rest of the project. Accent discipline per `CLAUDE.md` —
one accent dominates, the rest stay sparse:

- **Turquoise** (dominant) — section headings, timeline nodes, chip borders, the contact link.
- **Pink** — the résumé CTA only.
- **Purple** — portrait glow only.
- **Green** — `AvailabilityStatus` only.

The page keeps its own `<main className={styles.page}>` wrapper with the existing
`6rem 2rem 8rem` padding. `<Footer />` remains outside `<main>` in `layout.tsx`, untouched.

## Motion

CSS hover transitions only. No GSAP, no WebGL, no scroll-triggered animation — the orchestrated
motion moment belongs to the hero. All transitions disabled under
`@media (prefers-reduced-motion: reduce)`, extending the existing block at
`src/app/about/page.module.css:136-140`.

## Accessibility

- One `<h1>` ("About"); blocks use `<h2>`, entries `<h3>`.
- Timeline is an `<ol>`; testimonials use `<blockquote>` + `<figcaption>`.
- Client logos are decorative (`alt=""`) — the company name is adjacent in text.
- Social links keep `target="_blank"` with `rel="noopener noreferrer"`, per `/contact`.
- The sticky rail must not trap focus or obscure content at 900px; verify tab order runs rail →
  content.

## Dependencies

**No runtime dependencies added.** The page ships no new `dependencies` entries — notably not
`react-icons`, which the old page required for the technology block.

Test tooling is added as `devDependencies`, amending this spec's original "none added": the
project currently has no test framework, no test script, and no test files, so the extractions
above (`AvailabilityStatus`, `src/lib/testimonials.ts`) would ship with nothing guarding the
call sites they refactor. Added: `vitest`, `@vitejs/plugin-react`, `jsdom`,
`@testing-library/react`, `@testing-library/jest-dom`, plus a `vitest.config.ts` and an
`npm test` script.

## Also in scope

Remove the GitLab entry from `SOCIAL_LINKS` (`src/lib/siteLinks.ts:15`). Sam confirmed GitHub
as the account to surface. This is a one-line change that also affects `/contact` and the
footer, both of which map over `SOCIAL_LINKS`. The now-unreferenced `GitLabIcon` in
`src/components/footer/icons.tsx:30` stays — it costs nothing and the project repo links still
point at GitLab.

## Out of scope

- **Migrating project `repo:` links off GitLab.** Five case studies point at `gitlab.com/bklep`
  (`dds.md`, `edge196.md`, `wig.md`, `ultra-demo.md`, `wgfps.md`). Removing the GitLab social
  link leaves the socials saying GitHub while project pages link GitLab. Real inconsistency,
  separate task — it needs the repos to actually exist on GitHub first.
- **Per-role timeline descriptions.** Pending Sam's copy; the field exists.
- **Labelling the Mar 2020 – Jul 2021 gap.** ~16 months between the DigitalCrafts certification
  and the WealthGuard role. The bio claims freelance small-business work and several client
  logos likely date from exactly that period, so an explicit freelance entry would convert a
  visible hole into experience. Sam has not confirmed it; the timeline ships without it rather
  than with an invented entry. The Jun – Nov 2025 gap is ~4 months and needs nothing.
- **More testimonials.** Two is what exists and is attributable. Not padded.
- **`project_metrics` / stats strip.** Still empty, still out of scope, same reason.

## Success criteria

1. `/about` renders the bio, four-role timeline, grouped stack, and both testimonials — all in
   page source, none behind an interaction.
2. Résumé and contact CTAs remain reachable at any scroll position on desktop.
3. Availability status renders from a single shared component used by all three call sites.
4. Both testimonials resolve from `src/lib/testimonials.ts`; no testimonial copy is duplicated
   in a component.
5. `npm run build` passes: type-check and lint clean. `npm test` passes.
6. No new runtime dependencies; no changes under `drizzle/` or to `src/db/`.
7. Layout holds at 320px, 768px, 900px, and 1440px.
8. Nothing on the page is unattributable — no ratings, metrics, or role descriptions that
   cannot be traced to something Sam supplied.
