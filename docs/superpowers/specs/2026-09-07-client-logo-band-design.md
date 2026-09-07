# Client logo band — design

Replaces the auto-scrolling client logo carousel carried over from the old
samklep.dev homepage.

## Problem

The old site ran a scrolling marquee labeled "Some local businesses I've worked
with." The motion fights the job. The band exists to establish credibility at a
glance — scanned in about a second, on the way to the work. A strip that moves
cannot be scanned, and logos parked offscreen make the set feel unknowable.

The overlap with the project data is not a problem to solve and it is not new.
Both sites list all fifteen projects on `/projects` and show a short featured set
on the home page; the logos have always named companies the projects already
name. That is fine so long as the band does a different job — proof a visitor
recognizes without reading, ahead of a catalog they have to read. It stops being
fine the moment the band tries to be a second index into the work, which is why
it is not one.

## Decision

A static, non-animated band of monochrome client logos, placed between the About
section and Selected work on the home page. No carousel, no marquee, no
JavaScript.

Reading order becomes an argument: who I am → who trusted me → the work itself.
The band is the hinge that earns the grid beneath it, and it stays clear of the
pinned GSAP hero, which owns the only orchestrated motion on the page.

## Non-goals

- **Not navigation.** Logos do not link to project pages. The grid is the way
  into the work; a second, less legible index competing with it helps nobody.
- **Not a count.** The band asserts no number. See "Why no figure" below.
- **Not a database table.** See "Data" below.

## Data

The logo list is a local constant in the component, not a Postgres table.

The two sets do not align, and forcing them together would misrepresent both:

| | |
|---|---|
| Logo, no project file | Melissa Hawkins Photography |
| Project file, no logo | BuildOn Technologies, Gulf Winds International, One Time Close |

A `clients` table would mean a schema change and a migration to hold eleven
static rows that nothing else queries, joined to projects by a relationship that
is partial in both directions. The project laid down the rule that Postgres holds
*queryable* metadata; a curated display list that is never filtered, sorted, or
searched is not that.

Each entry is:

```ts
type ClientLogo = {
  name: string;   // used as alt text
  src: string;
  width: number;
  height: number;
  scale?: number;        // optical size correction, see Layout
  unoptimized?: boolean; // SVG sources only
};
```

### Sources

Eleven assets exist in `public/images/logos/`. All nine PNGs carry an alpha
channel, which the monochrome treatment requires.

| Asset | Client | Intrinsic | Ratio |
|---|---|---|---|
| `dss-logo.png` | DeLeon Safety Solutions | 400×340 | 1.18 |
| `ud.png` | Ultra Demolition | 192×120 | 1.60 |
| `mHawk.png` | Melissa Hawkins Photography | 296×106 | 2.79 |
| `winfields-logo.svg` | Winfield's Chocolate Bar | square | 1.00 |
| `becks-logo.png` | Becks Prime | 191×147 | 1.30 |
| `cBit-logo.png` | C-Bit Trainer | 141×124 | 1.14 |
| `ticHelper-logo.png` | TicHelper | 302×230 | 1.31 |
| `SuperChef-logo.png` | SuperChef | 500×250 | 2.00 |
| `fha-logo.png` | FHA | 360×120 | 3.00 |
| `wig-logo.png` | WealthGuard Insurance Group | 184×191 | 0.96 |
| `edge196.svg` | Edge196 | square | 1.00 |

`dss.jpg` is skipped — it is `dss-logo.png` flattened onto white, so it has no
alpha and cannot be knocked out. The file stays where it is; removing it is out
of scope.

Adding a client later is one entry in the constant plus the asset — the list is
ordered by hand, so new marks go wherever they balance the rows best rather than
appended.

## Layout

Each logo renders inside a fixed-height box, sized by height and never by width:

```
height: 2.5rem      (1.75rem below 640px)
width: auto
max-width: 9rem
object-fit: contain
```

Sizing by height is the whole trick. The set spans 3.00 (FHA, a wide wordmark) to
0.96 (WealthGuard, taller than wide); matching on width would render FHA as a
hairline and WealthGuard as a slab.

Height alone is not sufficient either. At equal height a square badge carries far
more ink than a wordmark and reads as louder. The optional `scale` corrects this
per logo — roughly `0.85` for the square and near-square marks (Edge196,
Winfield's, WealthGuard, C-Bit, DeLeon, Becks, TicHelper), unset for the wide ones
(FHA, Melissa Hawkins, SuperChef, Ultra Demolition). Values are tuned by eye
against the rendered band, not computed.

The container is a centered `flex-wrap` row, `gap: 2.5rem 3.5rem`, tightening to
`2rem 2.5rem` below 640px so the band lands about three marks per row on a phone
instead of two.

Spacing follows the `PlaceholderSection` convention already established on this
page: padding on one side of the section only. Every neighbouring section brings
its own `6rem`, and padding does not collapse the way margins would.

## Color

```
filter: brightness(0) invert(1);
opacity: 0.55;
```

Eleven client logos in eleven brand palettes on `#0B0E14` is a ransom note. The
knockout flattens all of them to a single white, so the band reads as one texture
and stays subordinate to the work below it — which is the point of putting it
above the grid rather than in it.

Hover and focus restore full color at full opacity, with the transition disabled
under `prefers-reduced-motion`.

The two SVG sources need `unoptimized` on `next/image`; the optimizer returns 400
for SVG unless `dangerouslyAllowSVG` is set, and the header logo already
establishes this precedent. There is nothing in a vector for the optimizer to do.

## Markup and accessibility

```
<section aria-labelledby="clients-heading">
  <h2 id="clients-heading">Businesses I've built for</h2>   // mono, uppercase, small
  <ul>
    <li><Image alt={name} … /></li>   // ×11
  </ul>
</section>
```

`alt` carries the company name on every logo. This matters more here than in a
typical logo strip: the marks are knocked back to 55% white and the company names
appear nowhere else on the page, so without alt text the band is unreadable to a
screen reader and near-unreadable to anyone who does not already recognise the
logos.

The band is below the fold, so the default lazy loading is correct.

## Why no figure

The label states no count. Any number would have to be reconciled across two
stores that disagree — eleven logo files, fifteen project files, roughly twelve
distinct clients once FHA and WealthGuard's duplicate entries collapse — and then
kept true as work is added. The project's own rule about metrics applies:
unverifiable numbers on a portfolio are worse than none.

"Businesses I've built for" makes the claim without incurring the debt.

## Open questions

- **Hover on unlinked logos.** Restoring color on hover is a mild affordance
  lie — it suggests a click target that is not there. Kept because it reads as
  texture rather than a promise, but dropping it costs nothing and is a
  defensible reversal.

## Files

| File | Change |
|---|---|
| `src/components/home/ClientBand.tsx` | new |
| `src/components/home/ClientBand.module.css` | new |
| `src/app/page.tsx` | import and place between About and Selected work |

No new dependencies, no schema change, no migration, no client-side JavaScript.
