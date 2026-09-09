# Home services bento — design

Expands `ServicesSection` from two cards to a four-card bento with varied column
spans, in the manner of the Radiant template's bento grid. Two cards are new; the
two existing ones keep their shipped copy unchanged.

Builds on `docs/superpowers/specs/2026-09-08-home-services-section-design.md`,
which stays the reference for `RingField` itself. This spec covers only what
changes.

## What the section now holds

Four cards under the existing eyebrow `SERVICES` and heading **What I build**.
The heading is unchanged and still fits: two cards are the offerings, and the two
new ones are *how* that work gets delivered and *what it is built with*.

| Span | Card | Graphic | New? |
|---|---|---|---|
| 4 | Design & build | `WireframeField` | existing, copy unchanged |
| 2 | Built with | `RingField` | new |
| 2 | From scope to launch | `RingField` | new |
| 4 | Custom applications | `DashboardField` | new |

Each card has a graphic, but only the two narrow ones carry the ring field.
Diagonally opposite ring cards give the block a balance that four identical ones
did not, and the effect stays a signature rather than becoming wallpaper.

**`RingField` is the only animated graphic.** `WireframeField` and
`DashboardField` are static. That is what lets the wide cards carry artwork
without competing with the ripple: the hierarchy is motion first, then the lit
ring cores, then everything static. `DashboardField`'s highlighted bar is
deliberately held below full turquoise for the same reason — at full strength it
outshines the ring cores and inverts that order.

The two wide graphics are abstractions, never screenshots. The projects section
sits directly below this one and shows real client work; putting client UI in the
service cards blurs the line between *what is offered* and *what was built*, and
duplicates imagery a reader meets again a few hundred pixels later.

**Every card still reserves the `13rem` graphic slot, ring field or not.** Only
the graphic *inside* it is conditional. This is what keeps every card's title on
the same line across a row. Dropping the slot on solid cards puts their title
flush against the card's top edge, because `.body` carries no top padding — the
graphic is what provides that space.

```
┌──────────────────────────┬─────────────┐
│  Design & build      (4) │ Built with  │
│                          │         (2) │
├─────────────┬────────────┴─────────────┤
│ From scope  │  Custom applications (4) │
│ to launch(2)│                          │
└─────────────┴──────────────────────────┘
```

### Copy for the two new cards

Both are narrow, so both are shorter than the wide cards.

| Card | Body |
|---|---|
| Built with | TypeScript and React on the front. C#/.NET or Node behind it. Postgres or SQL Server for the data. |
| From scope to launch | Scope and estimate up front, design you sign off on, then build in visible increments. Working software early, not a reveal at the end. |

The stack named in "Built with" is the one this repo and the project grid already
evidence: TypeScript, React, and C# per `CLAUDE.md`; DotNET and MSSQL per the
seeded project tags; Postgres and Next.js per this codebase. Do not add
languages or frameworks to this card that nothing on the site backs up — an
unverifiable stack list on a portfolio is worse than a short one.

### Why this does not re-collide with About

`AboutSection` is headed **How I work** and its intro is a philosophy statement:
understand the business first, build only what serves it. "From scope to launch"
is deliberately a different altitude — concrete engagement stages and delivery
cadence, not values. The two must not be edited toward each other. If a future
change makes the card restate About's intro, the card is the one that should
move.

## Layout

The grid becomes 6 columns above `720px`, with cards spanning 4 / 2 / 2 / 4 in
DOM order. Below `720px` it collapses to a single column and every card spans
full width, so span classes must not apply at that size.

Grid gap tightens from `2rem` to `1.5rem`. Four cards at `2rem` reads as four
separate objects; a bento should read as one composed block.

Spans are carried by a `wide` / `narrow` field on each entry of the `SERVICES`
constant, mapped to a CSS Modules class on the `<li>`. Not inline `style`
attributes: the span is a layout rule that belongs in the stylesheet with the
breakpoint that governs it, and inline styles could not be scoped to the
`720px` media query.

DOM order is the visual order — `4, 2, 2, 4` fills two rows of six exactly, so
no explicit `grid-column-start` placement is needed and the single-column
fallback stays correct for free.

Everything else about the card surface — `#12161F`, the `1px` hairline,
`0.75rem` radius, `overflow: hidden`, the `13rem` graphic slot, the
`z-index: 1` body, the `@media (hover: hover) and (pointer: fine)` guard — is
unchanged.

## The ring field must be sized by height, not card width

This is the one substantive change to `RingField.module.css`, and it is required
by the varied spans rather than optional polish.

`.rings` was `width: 130%` of its card. With equal columns that was fine. With 4/2
spans the cards are roughly 632px and 304px wide, so the same rule would render the
field at scale 1.64 and 0.79 — **~13px ring spacing in the wide cards against ~6px
in the narrow ones.**

Both ring cards ended up narrow, so this no longer bites today. It is kept because
it is the correct rule and because moving a ring field onto a wide card — a one-line
change to a `rings` flag — would silently reintroduce the mismatch otherwise.

The graphic slot is `13rem` tall in every card regardless of span. Sizing the
square field off that constant instead:

```css
.rings {
  height: 39rem;
  width: 39rem;
}
```

`39rem` is 3x the `13rem` graphic slot — stated explicitly rather than as
`height: 300%; width: auto; aspect-ratio: 1`, because that form depends on
`aspect-ratio` filling an auto axis (verified only in Chrome) and would silently
revert to the width-relative bug if `width` ever resolved. If the graphic slot
changes, change this to match.

At 624px the field gives one scale of ~1.25 and ~10px ring
spacing in all four cards — near the ~9.6px the two-card version shipped with.
Wide cards simply reveal more of the same field horizontally; narrow cards clip
more of it. Both are already handled by the card's `overflow: hidden` and the
existing radial mask.

Do not restore a width-relative size here. It looks equivalent on a uniform grid
and silently breaks the moment spans differ.

### And the edge fade must be card-relative

`.rings` carries its own radial mask, but that mask fades relative to the **field**,
not the card. A 304px card reveals only the middle of the 624px field, where alpha is
still ~0.66, so without help the rings are cut off hard at both sides.

Both ring cards are narrow and therefore the same width, so they at least fail
identically — but they still fail. The fade below is what softens that cut.

`.card::after` therefore carries a horizontal gradient to the card background, with
its stops expressed as **percentages of card width**, so the fade is proportional and
identical at any span:

```css
background: linear-gradient(
  to right,
  #12161f 0%,
  rgba(18, 22, 31, 0) 14%,
  rgba(18, 22, 31, 0) 86%,
  #12161f 100%
);
```

It is `pointer-events: none` so it cannot intercept the card hover, and it sits at
`z-index: 0` — above `.graphic` in tree order, below `.body`'s `z-index: 1` — so it
veils the rings without touching the copy.

## Accepted costs

Two ring fields is 84 animated SVG circles — unchanged from the two-card version,
despite there now being four cards. Hover animates one card's 42 at a time, behind
the fine-pointer guard. `stroke-opacity` is not compositor-animatable, so this
remains the feature's one plausible weak-GPU risk, at the same surface as before.

Every card reserves the `13rem` slot, so all four titles sit on the same line
across a row. The wide cards were briefly shipped with that slot empty and it read
as unfinished rather than restrained — a 632x385 card holding two lines of copy
needs something in it. Hence the two static graphics.

## Verification

- `npm run build` passes — it type-checks and lints.
- The two narrow cards show ring fields; the wide cards show the wireframe and
  dashboard graphics respectively.
- Nothing animates on load. The only animation in the section is the ring ripple,
  and only while a ring card is hovered.
- Every card's title sits on the same line as its row partner's — the check that
  fails if the `13rem` slot stops being reserved on solid cards.
- The two ring fields show visibly the **same** ring spacing. Both ring cards are
  now the same width, so this no longer proves the height-based sizing is working;
  it would only fail if something else regressed.
- Spans render 4/2/2/4 above 720px and a single full-width column below it.
- Hovering any card ripples only that card; mouse-out resets it rather than
  freezing.
- `prefers-reduced-motion: reduce` still removes the animation everywhere.
- No focusable elements inside the section; tab order still runs "More about me"
  → "All projects".
- Legible at the narrowest testable viewport with no horizontal page overflow.
