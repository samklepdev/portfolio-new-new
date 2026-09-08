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

A static, non-animated band of monochrome client logos, placed directly below the
hero and above the About section. No carousel, no marquee, no JavaScript.

Reading order becomes an argument, and proof leads it: who trusted me → who I am
→ the work itself. The visitor meets the client names before any claim is made in
the first person.

The tradeoff is that the band arrives the moment the pinned GSAP hero releases,
instead of sitting clear of it. That is acceptable precisely because the band is
static: it introduces no motion to compete with the hero's boot-up, and knocked
back to 55% white it reads as texture during the handoff rather than as a second
event demanding attention.

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
| Logo, no project file | Melissa Hawkins Photography, PsycTech, Baylor College of Medicine |
| Project file, no logo | One Time Close, C-Bit Trainer, TicHelper, Super Chef |

A `clients` table would mean a schema change and a migration to hold twelve
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

Twelve assets in `public/images/logos/`.

| Asset | Client | Intrinsic | Ratio |
|---|---|---|---|
| `buildon-logo.png` | BuildOn Technologies | 408×100 | 4.08 |
| `mHawk.png` | Melissa Hawkins Photography | 259×72 | 3.60 |
| `psyctech-logo.png` | PsycTech | 800×254 | 3.15 |
| `fha-logo.png` | FHA | 360×120 | 3.00 |
| `ud.png` | Ultra Demolition | 185×111 | 1.67 |
| `becks-logo.png` | Becks Prime | 191×147 | 1.30 |
| `baylor-logo.png` | Baylor College of Medicine | 124×101 | 1.23 |
| `dss-logo.png` | DeLeon Safety Solutions | 400×340 | 1.18 |
| `gwi-logo.png` | Gulf Winds International | 143×142 | 1.01 |
| `winfields-logo.svg` | Winfield's Chocolate Bar | square | 1.00 |
| `edge196.svg` | Edge196 | square | 1.00 |
| `wig-logo.png` | WealthGuard Insurance Group | 184×191 | 0.96 |

PsycTech replaces the separate C-Bit Trainer and TicHelper marks and Baylor
College of Medicine replaces SuperChef; BuildOn and Gulf Winds were added after.

### The transparency prerequisite

The knockout requires a genuinely **transparent background**, which is not the
same thing as having an alpha channel. `sips -g hasAlpha` reports whether the
channel exists, not whether it is used — a fully opaque RGBA file passes that
check and still renders as a solid white rectangle under the filter.

Audit by sampling border-pixel alpha instead. Three files failed this and were
repaired:

| Asset | Was | Fix |
|---|---|---|
| `baylor-logo.png` | white type on an opaque blue tile, no alpha channel at all | key on luminance, keep light pixels |
| `mHawk.png` | black script on an opaque white field | key on luminance, keep dark pixels |
| `ud.png` | black artwork on an opaque white field | key on luminance, keep dark pixels |

In each case alpha is ramped across a threshold band rather than hard-cut, so
antialiased edges stay smooth, the original RGB is preserved, and the transparent
margin is trimmed afterwards. Baylor goes 180×182 → 124×101 — the tile is gone
and only the wordmark survives.

`dss.jpg` remains skipped — it is `dss-logo.png` flattened onto white, so it has
no alpha and duplicates a file that does. It stays where it is; removing it is
out of scope.

New assets must clear the border-alpha audit before being added.

Adding a client later is one entry in the constant plus the asset — the list is
ordered by hand, so new marks go wherever they balance the rows best rather than
appended.

## Layout

Each logo renders inside a fixed-height box, sized by height and never by width:

```
height: 2.5rem      (1.75rem below 640px)
width: auto
max-width: 10rem
object-fit: contain
```

Sizing by height is the whole trick. The set spans 4.08 (BuildOn, a wide
wordmark) to 0.96 (WealthGuard, taller than wide); matching on width would render
BuildOn as a hairline and WealthGuard as a slab.

Height alone is not sufficient either. At a given height, a solid mass of ink
reads louder than a hairline mark of the same height, whether it sits in a badge
or a wordmark — shape alone does not predict weight. The optional `scale`
corrects this per logo, knocking back the heaviest marks: BuildOn (`0.92` — the
boldest wordmark in the set, and the only one that hit the `max-width` ceiling),
FHA (`0.85` — the largest unbroken ink mass, a solid house) and DeLeon (`0.85`),
Becks and WealthGuard (`0.8` each), and Gulf Winds and Edge196 (`0.78` each, the
two smallest square badges). Hairline marks run unscaled even when square or
near-square — Baylor's stacked serif and Winfield's monogram are lighter than
some of the scaled marks even at full size — as do the wide marks that are
already light on the page: PsycTech, Melissa Hawkins, and Ultra Demolition.
Values are tuned by eye against the rendered band, not computed.

The container is a centered `flex-wrap` row, `gap: 2.5rem 4rem`, tightening to
`2rem 2.5rem` below 640px so the band lands about three marks per row on a phone
instead of two.

The column gap is load-bearing rather than cosmetic. With a fixed 960px content
box the band only wraps after the sixth mark if the first row is nearly full, so
how evenly the rows *can* balance is bounded by how much of the row is
whitespace — 3.5rem produced a lopsided 919/527 split where 4rem gives 783/713.
That balance holds at the ≥1024px viewport it was tuned against; between 640px
and 1024px `flex-wrap` re-breaks the band at widths nobody tuned, which is
inherent to flex and not worth a grid to fix.

Spacing follows the `PlaceholderSection` convention already established on this
page: padding on one side of the section only. Every neighbouring section brings
its own `6rem`, and padding does not collapse the way margins would.

## Color

```
filter: brightness(0) invert(1);
opacity: 0.55;
```

Twelve client logos in twelve brand palettes on `#0B0E14` is a ransom note. The
knockout flattens all of them to a single white, so the band reads as one texture
and stays subordinate to everything below it — which is the point of putting it
outside the grid rather than in it.

**Hover lifts opacity to 1 and keeps the knockout.** It does not restore brand
color. Restoring color was the original design and it does not survive contact
with the actual assets: Melissa Hawkins and Ultra Demolition are black artwork,
so "full color" on a `#0B0E14` background renders them invisible, and Baylor is
now white type, so nothing visibly happens at all. An opacity lift works for
every logo regardless of its source color, and it drops the affordance problem —
a color change reads as "this is a link", where a brightness change reads as
texture.

The transition is disabled under `prefers-reduced-motion`.

The two SVG sources need `unoptimized` on `next/image`; the optimizer returns 400
for SVG unless `dangerouslyAllowSVG` is set, and the header logo already
establishes this precedent. There is nothing in a vector for the optimizer to do.

## Markup and accessibility

```
<section aria-labelledby="clients-heading">
  <h2 id="clients-heading">Businesses I've built for</h2>   // mono, uppercase, small
  <ul>
    <li><Image alt={name} … /></li>   // ×12
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
stores that disagree — twelve logo files against fifteen project files, three of
the logos naming companies with no project at all, four projects having no logo,
and FHA and WealthGuard carrying duplicate project entries — and then kept true as
work is added. The project's own rule about metrics applies: unverifiable numbers
on a portfolio are worse than none.

"Businesses I've built for" makes the claim without incurring the debt.

## Open questions

None outstanding. The hover question — whether restoring brand color on an
unlinked logo is an affordance lie — was settled by the assets themselves; see
"Color" above.

## Files

| File | Change |
|---|---|
| `src/components/home/ClientBand.tsx` | new |
| `src/components/home/ClientBand.module.css` | new |
| `src/app/page.tsx` | import and place between the hero and the About section |

No new dependencies, no schema change, no migration, no client-side JavaScript.
