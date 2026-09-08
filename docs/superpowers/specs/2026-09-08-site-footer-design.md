# Site footer — design

Adds the footer the old samklep.dev had, restyled to the new site. This is the
last piece of layout chrome `CLAUDE.md` lists as outstanding.

## Placement

`src/components/footer/Footer.tsx` plus a colocated CSS module, rendered in
`src/app/layout.tsx` as a sibling of `{children}` — site-wide, as on the old
site, and outside `<main>` so it is a proper `contentinfo` landmark.

Its nav carries `aria-label="Footer"` to distinguish it from the Header's
`aria-label="Main"`; two unlabelled navigation landmarks on a page are
indistinguishable to a screen reader.

## Layout

One row: logo left, navigation and social links right, with a hairline above and
the copyright on a separate line below. This mirrors the Header's horizontal
rhythm so the page is bookended, and it adds the least vertical weight after an
already-tall contact section. Stacks to centred below 640px.

## Content

Taken from the old footer, with two deliberate reconciliations:

| Old footer | Here | Why |
|---|---|---|
| `sam@samklepper.com` | `hello@samklep.dev` | The address the site owner confirmed works, and the one `/contact` and the home contact section already publish. Two different addresses across one site is a bug. |
| LinkedIn, GitLab only | LinkedIn, GitHub, GitLab | `/contact` already publishes a GitHub link. The footer matching it keeps the site from contradicting itself. |

Unchanged: the SBK logo linking home, the four nav links (Home, About, Projects,
Contact), and the resume PDF.

The logo uses `sbk-logo-dark.svg` — the light-artwork variant meant for dark
backgrounds — with `unoptimized`, because the image optimizer returns 400 for SVG
unless `dangerouslyAllowSVG` is set. Precedent: `Header.tsx`.

External links get `target="_blank"` with `rel="noopener noreferrer"`; the resume
gets `download`. Both match `/contact`.

## Shared link constants

New `src/lib/siteLinks.ts` exporting `NAV_LINKS`, `SOCIAL_LINKS`, `RESUME_URL`
and `EMAIL`. `Header.tsx`, `/contact`, and the new `Footer` all read from it.

This is not incidental refactoring. The resume URL is currently hardcoded in
`Header.tsx` and again in `src/app/contact/page.tsx`; the footer would make a
third copy, and the social URLs a second. Renaming the PDF would then break some
call sites and not others. The PR #13 review flagged this duplication as
something to fold in "whenever a `src/lib/links.ts` appears" — this is that
moment, and adding a third copy instead would be knowingly making it worse.

Scope is limited to moving the constants and updating the three consumers. No
behaviour changes to Header or `/contact`.

## Copyright line

```
© {year} SbK. All rights reserved.
```

Two notes.

The period after "SbK" is added; the old line reads `© 2026 SbK All rights
reserved.` with none. A typographic fix, recorded so it does not look like drift.

**The year is evaluated at build time on statically prerendered pages.**
`new Date().getFullYear()` runs when the page renders, and `/about` and
`/contact` are fully static with no `revalidate` — so after New Year they will
show the previous year until the site is redeployed. `/` self-heals via its 60s
revalidate.

This is accepted rather than solved. The alternatives are worse: hardcoding
guarantees staleness, and computing the year in the browser makes the footer a
client component, ships JavaScript to render a number, and risks a hydration
mismatch. Naming it here so a stale year in January reads as a known tradeoff
rather than a bug.

## Spacing

The footer carries a top hairline and its own padding. Pages already end with
6–8rem of bottom padding (`/about`, `/contact` and the home contact section use
`8rem`; `/projects` uses `6rem`), which supplies the gap above the rule.

This is worth verifying rather than assuming: the same "padding does not
collapse" arithmetic that produced a 12rem hole in an earlier layout applies
here. If 8rem plus the footer's own top padding reads as a hole, the footer's
padding gives way, not the pages'.

Note that the `:last-child` trap `CLAUDE.md` warns about is already gone —
`PlaceholderSection` was deleted with the contact section, and `ContactSection`
owns its bottom padding explicitly. Adding a footer no longer changes any
section's spacing.

## Files

| File | Change |
|---|---|
| `src/lib/siteLinks.ts` | new — shared nav, social, resume and email constants |
| `src/components/footer/Footer.tsx` | new |
| `src/components/footer/Footer.module.css` | new |
| `src/app/layout.tsx` | render `<Footer />` after `{children}` |
| `src/components/header/Header.tsx` | consume the shared constants |
| `src/app/contact/page.tsx` | consume the shared constants |

Server component. No new dependencies, no schema change, no client JavaScript.

## Verification

`npm run build` (type-checks and lints), then a browser check on **every** route,
because this is the first change that touches all of them: `/`, `/about`,
`/contact`, `/projects`, and a `/projects/[slug]` page. Confirm the footer
renders, the spacing above it reads as intentional, and the Header and `/contact`
still work after the constant move.

Then `document.body.scrollWidth <= window.innerWidth` at 320 / 375 / 640 / 900px.
`globals.css` sets `overflow-x: hidden`, so a row of links overflowing on a phone
produces no scrollbar and no visible symptom.

Do not run `npm run build` while `next dev` is running — it overwrites `.next`
and leaves the dev server throwing `MODULE_NOT_FOUND` against its own chunks.
