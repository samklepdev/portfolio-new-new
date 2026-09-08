# Home services section — design

Adds a services section to the home page, carrying an animated concentric-ring
graphic adapted from the Radiant Tailwind Plus template's "Smart call
scheduling" bento card (`LinkedAvatars`).

Radiant is a licensed template the site owner holds locally. This is a
reimplementation of the visual idea in the conventions of this repo, not a port:
the original is Tailwind plus framer-motion, and this codebase bans Tailwind and
does not carry framer-motion.

## Placement

`src/components/home/ServicesSection.tsx` plus a colocated CSS module, rendered
in `src/app/page.tsx` between `<AboutSection />` and the projects section.

The home page becomes:

```
HeroSection → ClientBand → AboutSection → ServicesSection → projects → ContactSection
```

Spacing follows the site convention — the section pads only its top
(`padding: 6rem 0 0`) and the last child of `<main>` owns the bottom, so
inserting it changes no other section's spacing. Its inner container matches
`AboutSection` and the projects section: `max-width: 64rem`, `padding: 0 2rem`.
Not the Header/Footer's `78rem`/`1.5rem`; this is a page section, not chrome.

## Why a new section, and what moves out of About

`AboutSection` was already headed **"What I do"** and already listed three
capabilities — Modern, Full-stack, SEO optimized. Its "Full-stack" item
(*"from simple brochure sites to heavy, data-driven applications"*) is precisely
the design/build ↔ custom-applications split this new section makes explicit.
Shipping both unchanged would have restated the same claim twice, fifty pixels
apart.

So the two sections split along *what* versus *how*:

| Section | Owns | Heading |
|---|---|---|
| `ServicesSection` | What you can hire him for | "What I build" |
| `AboutSection` | How he works | "How I work" (was "What I do") |

`AboutSection`'s three numbered items stay as written. They describe qualities
of the work rather than offerings, so they read correctly under "How I work"
once the offerings have moved out. Only its `<h2>` and its intro paragraph
change.

The intro is rewritten from a capability pitch to an approach statement:

> Current: "Knowing what it takes to get your business online is half the
> battle. From responsive layout to SEO optimization, social media to Google
> Analytics — I've got you covered."
>
> Becomes: "Every project runs the same way: understand the business first,
> then build only what serves it. No templates dressed up as custom work, and
> nothing you'll need a developer to update."

It does **not** become a biography. Inventing biographical facts about a real
person for their own portfolio is not something to guess at; if a genuine bio is
wanted later it needs source material from the owner.

## Structure

```
ServicesSection.tsx        section chrome, copy, the two cards
ServicesSection.module.css
RingField.tsx              the graphic
RingField.module.css
```

`RingField` is the self-contained unit — it takes no props, renders decorative
SVG, and carries `aria-hidden="true"`. The split mirrors `ContactSection`
holding chrome around `ContactForm`.

Both are **server components**. The effect is SVG plus a CSS `:hover` rule, so
it ships no client JavaScript at all. The Radiant original needs `'use client'`
and framer-motion to do the same thing.

### Card layout

Two equal columns on a `grid` with a `2rem` gap, collapsing to one column below
`720px`. Each card is a `#12161F` surface with a `1px` hairline border, `0.75rem`
radius, and `overflow: hidden` so the ring field is clipped to the card.

The ring field is anchored to a `13rem` block at the top of the card but is
deliberately larger than it — a square sized to the card's width, centred on that
block — so the rings spread across the whole card rather than stopping at a seam.
This departs from Radiant, which keeps its graphic and text in separate stacked
halves; the bleed reads as one surface instead of two.

Because the ring field is positioned and the copy is not, painting order would
otherwise put the strokes on top of the text. `.body` therefore carries
`position: relative; z-index: 1`. Do not remove it, and do not "fix" the bleed
with `overflow: hidden` on the field — the bleed is the intent.

## The ring field

26 concentric circles, all at `cx="250" cy="250"`, radius `n * 14 + 4`, in a
`0 0 500 500` viewBox. The spacing is Radiant's. The count is not: the original
draws 42, reaching radius 578, but everything past ~350 falls outside the mask
and is never seen. 26 covers the visible field.

Stroke is `--neon-turquoise` at `stroke-opacity: 0.15` at rest.

The field is masked by two gradients intersected, as in the original, so the
rings dissolve toward the edges rather than ending at a hard box:

```css
mask-image:
  linear-gradient(to bottom, black 90%, transparent),
  radial-gradient(circle, black 0%, transparent 100%);
mask-composite: intersect;
```

### The core

Radiant centres two avatar photographs and a green checkmark. Neither exists
here, and staging stock avatars on a solo portfolio would be decorative fiction.
The rings instead converge on a **glowing core node**: a ~3rem circle with an
accent border, low-opacity fill, and a `0 0 24px` bloom.

This is not a new invention — it is the status-dot motif already carrying the
"Available for work" pill in `ContactSection` and the success toast, scaled up.
The rings then read as signal radiating from a point.

## The animation

CSS keyframes with a per-circle delay. Each `<circle>` carries
`style={{ "--i": n }}`; the stylesheet derives
`animation-delay: calc(var(--i) * 50ms)`, reproducing framer-motion's
`delay: n * 0.05`.

```css
@keyframes ripple {
  0%     { transform: scale(1);    stroke-opacity: 0.15; }
  18.75% { transform: scale(1.08); stroke-opacity: 0.40; }
  37.5%  { transform: scale(1);    stroke-opacity: 0.15; }
  100%   { transform: scale(1);    stroke-opacity: 0.15; }
}
```

The cycle is 2s. The 37.5% mark is not arbitrary — it reproduces the original's
`duration: 0.75` with `repeatDelay: 1.25`, which is 0.75 of a 2s period.

Circles scale about the shared centre via `transform-origin: 250px 250px` with
an explicit `transform-box: view-box`.

### When it runs

Only under `.card:hover` and `.card:focus-within`. This is a deliberate
constraint, not a limitation inherited from the original: `CLAUDE.md` reserves
the one orchestrated animated moment for the hero's boot-up and warns against
scattering effects elsewhere. A hover-triggered ripple is user-initiated and
silent until asked for, so it does not compete.

`prefers-reduced-motion: reduce` removes the animation entirely; the rings
render static at rest opacity.

Touch devices get the static field. Nothing is gated behind the ripple — the
cards are fully legible without it.

## Colour

Turquoise for both cards. It is the dominant accent per the design direction,
and it matches the "All projects →" link immediately below.

Green is not used: it is reserved site-wide for status indicators. Pink is not
used: that weight belongs to the contact CTA. Both cards share one accent rather
than splitting turquoise/pink, because the rule is that one accent dominates per
screen and the others stay sparse.

## Copy

Eyebrow `SERVICES`, set in the mono face, uppercase and letterspaced — matching
`ProjectCard`'s category eyebrow.

Heading: **What I build**

| Card | Body |
|---|---|
| Design & build | Marketing sites taken from first wireframe to launch — responsive, fast, and structured so the people already searching for you actually land on you. |
| Custom applications | Dashboards, portals, and internal tools. The software that runs a business day to day, not just the site that describes it. |

Both draw on work already on the site: the DeLeon testimonial in
`ContactSection` for design and build, and BuildOn and One Time Close in the
project grid for applications.

## Performance

52 SVG circles total, of which at most 26 animate at once, since only the
hovered card's field runs. No new dependency, no client JavaScript, no images.

## Verification

- `next build` passes — it type-checks and lints.
- The ripple runs on hover of either card and stops on exit.
- The ripple does not run on load.
- With `prefers-reduced-motion: reduce`, no animation runs at any point.
- Section spacing is unchanged above and below the insertion point.
- Legible and correctly stacked at 390px.
