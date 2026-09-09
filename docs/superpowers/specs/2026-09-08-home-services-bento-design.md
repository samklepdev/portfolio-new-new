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

| Span | Card | New? |
|---|---|---|
| 4 | Design & build | existing, copy unchanged |
| 2 | Built with | new |
| 2 | From scope to launch | new |
| 4 | Custom applications | existing, copy unchanged |

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

`.rings` is currently `width: 130%` of its card. With equal columns that was
fine. With 4/2 spans the cards are roughly 632px and 304px wide, so the same rule
would render the field at scale 1.64 and 0.79 — **~13px ring spacing in the wide
cards against ~6px in the narrow ones.** The four boxes would visibly disagree,
which is the opposite of the intent.

The graphic slot is `13rem` tall in every card regardless of span. Sizing the
square field off that constant instead:

```css
.rings {
  height: 300%;
  width: auto;
  aspect-ratio: 1;
}
```

`300%` of `13rem` is `39rem` (624px), giving one scale of ~1.25 and ~10px ring
spacing in all four cards — near the ~9.6px the two-card version shipped with.
Wide cards simply reveal more of the same field horizontally; narrow cards clip
more of it. Both are already handled by the card's `overflow: hidden` and the
existing radial mask.

Do not restore a width-relative size here. It looks equivalent on a uniform grid
and silently breaks the moment spans differ.

### And the edge fade must be card-relative

Fixing the spacing moves the inconsistency rather than removing it. `.rings` carries
its own radial mask, but that mask fades relative to the **field**, not the card. A
632px card reveals almost all of the 624px field and reaches near-zero alpha at its
edge; a 304px card reveals only the middle, where alpha is still ~0.66, so the rings
are cut off hard at both sides. No single fade radius fixes both — the half-widths
differ by 2x.

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

Four ring fields is 168 animated SVG circles, up from 84. Hover still animates
only one card's 42 at a time, behind the fine-pointer guard, and `stroke-opacity`
is not compositor-animatable — so this remains the feature's one plausible
weak-GPU risk, now with twice the surface. Recorded rather than mitigated,
because the four-identical-graphics look is the requirement.

Repeating one graphic four times also spends the ripple's novelty. That was
raised and accepted by the site owner; it is a deliberate choice, not an
oversight.

## Verification

- `npm run build` passes — it type-checks and lints.
- All four cards show ring fields at visibly the **same** ring spacing. This is
  the check that would fail if the width-relative sizing came back.
- Spans render 4/2/2/4 above 720px and a single full-width column below it.
- Hovering any card ripples only that card; mouse-out resets it rather than
  freezing.
- `prefers-reduced-motion: reduce` still removes the animation everywhere.
- No focusable elements inside the section; tab order still runs "More about me"
  → "All projects".
- Legible at the narrowest testable viewport with no horizontal page overflow.
