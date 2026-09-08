# Home-page About section — design

Replaces the `PlaceholderSection` About stub on the home page with a designed
section: a photograph bleeding off the left edge of the viewport, content on the
right.

## Voice

The section carries the **services pitch** from the old samklep.dev homepage —
copy addressed to a business owner — not the biography that lives on `/about`.

This is a deliberate choice with a known cost. The client logo band directly
above already makes a credibility argument, visually and without prose, so a
services pitch immediately beneath it argues a related point a second time. The
alternative (introducing Sam) would have added the one thing the home page
otherwise lacks: a person. Services won because the site's job is winning
client work, and the pitch is what converts that audience.

If the site's purpose later shifts toward employment rather than contracts, this
section is the first thing to revisit.

## Layout

Two columns at `≥1024px`: figure left, content right. One column below that.

### The bleed

The figure is a grid item inside the page's usual centred 64rem container, pulled
left so it hangs **14rem past the left edge of the viewport**:

```css
.figure { margin-left: calc(16rem - 50vw); }
```

Derived, not guessed. The figure's natural left edge sits at
`(100vw − 64rem) / 2 + 2rem`. Solving that for a final position of `−14rem`:

```
−14rem = (100vw − 64rem)/2 + 2rem + margin
margin = −16rem − (100vw − 64rem)/2
       = 16rem − 50vw
```

Checks: at 1024px it resolves to `−16rem` against a natural left of `2rem` → −14rem.
At 1440px it resolves to `−29rem` against a natural left of `15rem` → −14rem. The
overhang is constant at every width above the breakpoint.

**The constant is the only thing to change if the overhang changes.** It is
`(32rem − 2rem − overhang) − 50vw`: `24rem` hangs 6rem off, `16rem` hangs 14rem.

No width calculation is needed. A stretched grid item absorbs a negative inline
margin by growing, so the figure's right edge stays where the grid put it. The
side effect is that the figure measures roughly `50vw + 64px`, which is what the
`sizes` attribute has to declare — a larger overhang means a wider figure, and an
under-declared `sizes` renders soft.

**Two consequences, named here rather than discovered later:**

1. **The figure widens as the viewport grows**, because it is anchored to the
   viewport edge while its right edge is anchored to the container. Height is
   fixed at `32rem` with `object-fit: cover`, so the visible crop moves from
   portrait-ish at 1024px toward landscape on very wide screens. This is correct
   for something meant to hang off the page, but it is a genuine change in
   proportion across widths, not a fixed frame.
2. **`globals.css` sets `overflow-x: hidden` on `html, body`**, so the bleed
   cannot produce a horizontal scrollbar. That is what makes the effect safe —
   and also what makes it dangerous: overflow here is *silent*. This is the same
   masking that hid the contact-page CTA clipping until a review caught it.
   Narrow widths must be checked deliberately, not by resizing a window.

### Below 1024px

The bleed is off entirely. The figure goes edge-to-edge (`margin: 0 -2rem`
against the container's `2rem` padding) at `16rem` tall, above the copy, and the
layout stacks to a single column. A 14rem overhang on a 375px viewport would put
more than half the image off-screen.

### Spacing

`padding: 6rem 0 0` on the section, with the horizontal padding on the inner
container instead — the figure must be free to escape it. This preserves the
page's convention: each section pads only its top, the last child of `<main>`
owns the bottom, because padding does not collapse the way margins do.

## Content

| Slot | Content |
|---|---|
| `h2` | What I do |
| Intro | The old site's "half the battle" paragraph |
| 01 | **Modern** — responsive layouts, fast loads, modern tooling and analytics |
| 02 | **Full-stack** — brochure sites through to data-driven applications |
| 03 | **SEO optimized** — dynamic metadata so the business gets found |
| Link | More about me → `/about` |

The three capabilities render as stacked rows separated by hairlines, each with a
large dim numeral and a turquoise mono label. No cards: card chrome — borders,
surfaces, shadows — is the opposite of the "minimal but bold" brief. Typography
carries the weight instead.

The section keeps `id="about"`, so the existing `/#about` anchor still resolves.

### One copy change from the source

The old site's SEO card claims dynamic metadata *guarantees* top Google results.
That is reworded. No one can guarantee search rankings; the claim is
unverifiable, and an unverifiable promise on a portfolio is a credibility
liability rather than an asset — the same reasoning that keeps a count off the
client band. The replacement describes what is actually delivered (dynamic
metadata, so the business gets found) without promising a position.

Everything else is the old copy, tidied only for typography — the source's `--`
becomes an em dash.

## Treatment

- `filter: saturate(0.55)` on the image. `laptop.jpg` carries a strong orange
  screen glow, and the palette rule is that one accent dominates per screen.
  Desaturating stops it competing with the turquoise.
- A right-edge gradient scrim into `#0B0E14`, so the photograph dissolves into
  the page rather than ending on a hard vertical line against the text column.
- The numerals are large and dim (white at ~12%); the labels are turquoise mono,
  uppercase. Boldness comes from scale and contrast, not from added colour.

## Images

`laptop.jpg` is **1.9MB at 4921×3076** — far larger than anything served.
`next/image` handles the resizing, and `sizes="(min-width: 1024px) 56vw, 100vw"`
is mandatory: without it the srcset is built from intrinsic size and ships up to
20× the needed pixels, exactly the defect found in the client band. The `56vw`
tracks the figure's `~50vw + 64px` width and must be revisited if the overhang
constant changes.

Downscaling the source to ~2000px wide would cut the file by roughly 80% and
speed up optimizer cold starts. Not done here; noted as a cheap follow-up.

## Files

| File | Change |
|---|---|
| `src/components/home/AboutSection.tsx` | new |
| `src/components/home/AboutSection.module.css` | new |
| `src/app/page.tsx` | swap the About `PlaceholderSection` for `<AboutSection />` |

`PlaceholderSection` stays — Contact still uses it. Contact remains the last child
of `<main>`, so the `:last-child` rule that gives it the page's bottom spacing is
unaffected.

No new dependencies, no schema change, no migration, no client-side JavaScript.

## Verification

`npm run build` (type-checks and lints), then a browser check at **1440px, 1024px,
768px, and 375px**. The narrow widths are not optional: `overflow-x: hidden`
guarantees that a bleed bug at 375px produces no scrollbar and no visible symptom.
Confirm `document.body.scrollWidth <= window.innerWidth` at each width rather than
trusting the eye.
