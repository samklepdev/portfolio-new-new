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

### Full-bleed, matching the Header

The `<footer>` element spans the viewport and carries the top rule, so it runs
edge to edge exactly like the Header's `border-bottom`. An inner container holds
the content.

That container mirrors `.nav` in `Header.module.css` precisely — **`max-width:
78rem` with a `1.5rem` gutter**, not the `64rem`/`2rem` the page sections use.
Matching only the full-bleed rule would have left the footer logo sitting inboard
of the header logo; matching the container puts both at the same x.

The baseline divider — the rule between the links and the copyright — stays at
content width deliberately. It separates two parts of the footer rather than
bounding the section, so it should align with the content, not the viewport.

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

### Icons

The social row is **icons only** — LinkedIn, GitHub, GitLab, and a download arrow
for the resume. The nav row above it stays text.

Inline SVG, no icon library: three brand marks plus an arrow do not justify a
dependency, and `Header.tsx` already establishes inline SVG as the pattern.

Icons pair to links by a stable `id` on `SOCIAL_LINKS` rather than by matching
the display label, which is copy and may change.

**Each label becomes visually-hidden text rather than being deleted.** The marks
are `aria-hidden`, so removing the labels outright would leave these links with
no accessible name — a screen reader would announce four bare "link"s. Tap
targets come from padding, giving each a 34px square hit area; an 18px icon alone
is far under any sensible minimum.

**Verify brand paths by rendering them, not by reading them.** Hand-written SVG
geometry can be subtly wrong while looking entirely plausible in a diff. The
paths here were confirmed by rasterising the actual `d` attributes out of the
source file and looking at the result.

Known tradeoff: a bare download arrow beside three recognisable brand marks does
not tell a sighted visitor what it downloads. Screen reader users are unaffected.
Restoring the word "Resume" for that one link is a two-line change if it proves
confusing.

## Shared link constants

New `src/lib/siteLinks.ts` exporting `NAV_LINKS`, `SOCIAL_LINKS`, `RESUME_URL`
and `EMAIL`. `Header.tsx`, `/contact`, and the new `Footer` all read from it.

This is not incidental refactoring. The resume URL is currently hardcoded in
`Header.tsx` and again in `src/app/contact/page.tsx`; the footer would make a
third copy, and the social URLs a second. Renaming the PDF would then break some
call sites and not others. The PR #13 review flagged this duplication as
something to fold in "whenever a `src/lib/links.ts` appears" — this is that
moment, and adding a third copy instead would be knowingly making it worse.

**The scope turned out larger than three consumers.** Beyond `Header.tsx` and
`/contact`, the published address also appeared in the contact action's Resend
`to` fallback, in that action's error copy, and again in `ContactSection.tsx` —
four more copies. Leaving them would have made the single-source-of-truth claim
false, so they were pulled in too. Nothing outside `siteLinks.ts` hardcodes a
published link now.

No behaviour changes anywhere: this is a constant move only.

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
| `src/components/footer/icons.tsx` | new — inline brand marks and download arrow |
| `src/app/layout.tsx` | render `<Footer />` after `{children}` |
| `src/components/header/Header.tsx` | consume the shared constants |
| `src/app/contact/page.tsx` | consume the shared constants |
| `src/app/actions/contact.ts` | consume the shared email |
| `src/components/home/ContactSection.tsx` | consume the shared email |

Server component. No new dependencies, no schema change, no client JavaScript.

## Verification

`npm run build` (type-checks and lints), then a browser check on **every** route,
because this is the first change that touches all of them: `/`, `/about`,
`/contact`, `/projects`, and a `/projects/[slug]` page.

| Check | Result |
|---|---|
| Footer renders on all five routes | ✅ |
| Navigation landmarks distinguishable | ✅ `Main` and `Footer` |
| Brand paths render as the correct marks | ✅ rasterised from source |
| Icon links have accessible names | ✅ LinkedIn, GitHub, GitLab, Resume |
| Icon tap targets | ✅ 34×34px |
| Footer spans the full viewport | ✅ at 320 / 375 / 640 / 900 |
| Header and footer logos aligned | ✅ both at the same x |
| No horizontal overflow | ✅ at 320 / 375 / 639 / 640 / 900 |
| Layout flips column → row at its breakpoint | ✅ exactly at 640px |

The overflow check is not optional: `globals.css` sets `overflow-x: hidden`, so a
row of links overflowing on a phone produces no scrollbar and no visible symptom.
Assert `document.body.scrollWidth <= window.innerWidth` rather than trusting the
eye.

Do not run `npm run build` while `next dev` is running — it overwrites `.next`
and leaves the dev server throwing `MODULE_NOT_FOUND` against its own chunks.
