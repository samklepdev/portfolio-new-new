# /contact page — design

**Date:** 2026-09-10
**Status:** approved, ready for implementation plan

## Problem

`/contact` is the weakest page on the site, and it is weaker than the contact section already
on the home page. The page offers a back link, an `<h1>Contact</h1>`, one paragraph, and a
single centred panel holding `AvailabilityStatus`, a `mailto:` link, and the social/résumé
list (`src/app/contact/page.tsx:12-59`). It has **no form**.

The home page section has one. `ContactSection` pairs `ContactForm` — name, email, budget,
website, message, wired through `submitContact` to Postgres and Resend — with an aside
carrying availability, a client testimonial, and an email fallback. A visitor who follows the
"Contact" nav link therefore lands on strictly less than they would have got by scrolling the
home page. The nav link currently costs the visitor something.

This design gives `/contact` the form and a layout of its own, so it reads as the destination
rather than a downgrade.

## Audience

Both clients and employers, client-leaning. The form is the primary path and is sized and
placed accordingly. The recruiter path — résumé, LinkedIn, GitHub — stays present and
reachable but does not compete for the page's centre of gravity. This is the mirror of
`/about`, which is employer-leaning by the same reasoning.

## Approach: split with dot field

A full-bleed two-column split. The left column carries identity, contact methods, and proof on
a tinted panel that bleeds to the viewport's left edge; the right column carries the form on
the plain page background. Below `1024px` the columns stack and the panel collapses to cover
only the intro column.

Adapted from the Tailwind UI "contact split with pattern" component. As with `RingField` —
reimplemented from the Radiant template's `LinkedAvatars` — the reference is Tailwind and this
project is not. It is rebuilt as CSS Modules with **no new dependency**.

```
┌───────────────────────────┬───────────────────────────┐
│ ·  ·  ·  ·  ·   ▒▒▒       │                           │
│  ·  ·  ·  ·      ▒        │   ┌─Name──┐ ┌─Email─┐     │
│ ·  ·  ·                   │   └───────┘ └───────┘     │
│                           │   ┌─Budget┐ ┌─Website┐    │
│  ← Home                   │   └───────┘ └────────┘    │
│  Get in touch             │   ┌─Message───────────┐   │
│  intro copy…              │   └───────────────────┘   │
│  ● Available for work     │            [ Let's talk ] │
│  ✉ hello@samklep.dev      │                           │
│  ⚲ Houston, TX            │                           │
│  LinkedIn · GitHub · Résumé│                          │
│  ❝ Ultra Demolition quote │                           │
└───────────────────────────┴───────────────────────────┘
   dot panel bleeds to edge          plain #0B0E14
```

Two alternatives were rejected:

- **Render `<ContactSection />` on the page.** Cheapest and guaranteed consistent, but the
  page would add nothing over scrolling the home page, and the heading and intro copy have to
  differ anyway — a section that says "Let's talk about your project" mid-scroll is not what a
  page titled Contact should open with.
- **Match the reference form exactly** (first/last name, phone, no budget/website). Would
  require a schema migration and a rewrite of `submitContact`'s validation, and would discard
  `budget`, which is a genuinely useful qualifier on an inbound project enquiry.

## Layout

### The bleed

The reference gets its panel to the viewport edge with a move that looks like a mistake if you
do not know why. The left column is `lg:static`. Because it is not positioned, the absolutely
positioned background *inside* it resolves against the nearest positioned ancestor — the outer
full-width wrapper, not the column — so `left: 0; width: 50%` becomes half the **viewport**
rather than half the column.

In CSS Modules:

```css
.page  { position: relative; isolation: isolate; }
.intro { position: relative; }                    /* < 1024px: panel fills this column */
.panel { position: absolute; inset: 0 auto 0 0; width: 100%; z-index: -1; }

@media (min-width: 1024px) {
  .intro { position: static; }                    /* promotes .panel to page scope */
  .panel { width: 50%; }
}
```

`isolation: isolate` on `.page` keeps the `z-index: -1` panel from escaping behind the page
background. Do not "tidy" `.intro`'s `position: static` into `relative` — the bleed depends on
that column *not* establishing a containing block, and the layout silently reverts to a
half-width panel floating inside the column.

### Dot field

The reference's panel is a repeating SVG grid. `CLAUDE.md` bans grid-floor backgrounds, so it
is replaced by a dot matrix, which is pure CSS — no SVG, no JS, no client component:

```css
background-image: radial-gradient(circle, rgba(255, 255, 255, 0.16) 1px, transparent 1px);
background-size: 28px 28px;
mask-image: radial-gradient(100% 100% at top right, #000, transparent);
```

The mask reproduces the reference's fade from the top-right corner. Include
`-webkit-mask-image` alongside it.

The reference's blurred `clip-path` blob is kept and recoloured from indigo to a
purple → turquoise gradient at low opacity. Purple `#B026FF` is restricted by `CLAUDE.md` to
"gradients and glow only", which is exactly this use and no other on the page.

Accent discipline: turquoise dominates, pink appears only on the form's submit button, green
only inside `AvailabilityStatus`.

### Left column

In order:

1. Back link — `← Home`, matching `/about`. Kept for consistency across the two pages even
   though `Header` provides nav site-wide.
2. `<h1>Get in touch</h1>` — replaces the stub's `<h1>Contact</h1>`. The page gets one heading,
   not a title plus a second title.
3. Intro paragraph.
4. `<AvailabilityStatus />` — the sanctioned use of `#39FF88`. On a contact page, whether the
   author is available is the single most load-bearing fact.
5. `<dl>` of contact methods — email and location, each with an inline outline SVG icon.
6. Link row — LinkedIn, GitHub, Résumé.
7. Testimonial — **Ultra Demolition** (`getTestimonial("ultra")`, Xavier Chavaria).

**No phone number.** The reference lists one; this page deliberately does not. A `tel:` link on
a public page is scraped, and the value is not worth that. The `<dl>` is two rows.

**Ultra, not DeLeon.** The home page's `ContactSection` already uses `deleon`, and `/about`
renders both. Using `ultra` here avoids showing the same quote twice to anyone who scrolls the
home page and then clicks through.

### Right column

`<ContactForm />`, unchanged.

No form changes are required, which is worth stating explicitly because it is not obvious: the
reference's field arrangement is *already* what the form renders. `.grid` in
`ContactForm.module.css:14-23` is single-column, becoming `1fr 1fr` at `560px`, and multiline
fields get `.fieldFull` (`ContactForm.tsx:49`) to span both tracks. So name/email sit on one
row, budget/website on the next, and message spans the width — the reference's layout, already
built.

### Spacing

Padding lives on the columns, not on `.page`. The panel must run the column's full height, so
a padded page wrapper would inset it and break the bleed. Columns carry roughly `6rem` top /
`5rem` bottom on mobile and `8rem` at `1024px`. The reference's `lg:py-48` (12rem) is dropped
to about `8rem` to match the vertical scale the rest of the site already uses.

## Files

| File | Change |
|---|---|
| `src/app/contact/page.tsx` | rewrite |
| `src/app/contact/page.module.css` | rewrite |
| `src/lib/siteLinks.ts` | add `LOCATION` (`"Houston, TX"`) |
| `src/components/contact/ContactMethods.tsx` | new — the `<dl>` and its inline icons |
| `src/components/contact/ContactMethods.module.css` | new |
| `src/app/contact/page.test.tsx` | new |

`ContactMethods` is extracted rather than inlined so `page.tsx` does not absorb two inline SVG
paths, following the `src/components/about/` precedent.

Icons are hand-written inline SVG at Heroicons' outline weight (24px, `stroke-width: 1.5`).
`@heroicons/react` is not installed and is not being added for two glyphs.

## Not changing

`ContactForm`, `submitContact`, the database schema, and the home page `ContactSection`.

## Testing

`src/app/contact/page.test.tsx`, following `src/app/about/page.test.tsx`. Assert the page
renders one `<h1>`, the email `mailto:` link, the location, the résumé and social links, the
testimonial attribution, and that the form's fields are present and labelled.
