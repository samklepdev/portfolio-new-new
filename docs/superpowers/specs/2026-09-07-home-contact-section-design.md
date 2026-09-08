# Home-page Contact section — design

Replaces the Contact `PlaceholderSection` stub with a working contact form on the
left and a "what happens next" panel on the right.

This is the first section on the site with a backend. Everything before it was
static markup; this one writes to Postgres and sends mail.

## Why a real form, when `/contact` deliberately has none

`/contact` ships a `mailto:` link, and its own comment explains why: a form that
silently drops messages is worse than a link that delivers. That reasoning stands
— it was an argument against *fake* forms, not against forms. This section
answers it by building the backend rather than faking the front end.

The rule that follows from it governs the whole design: **a submitted message
must never be silently lost.**

## Layer 1 — submission backend

### Schema

New table in `src/db/schema.ts`, following the existing `serial` id and
`timestamp({ withTimezone: true })` conventions:

```ts
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Delivery bookkeeping. The row is the durable record; email is best-effort,
  // so its outcome is recorded rather than assumed.
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  emailError: text("email_error"),
});
```

Applied via `db:generate` → `db:migrate`. The generated file in `drizzle/` is
committed and never hand-edited, and no DDL is written directly against the
database.

No IP column. See "Spam" below.

### Server action

`src/app/actions/contact.ts`, marked `"use server"`. The order of operations is
the load-bearing part:

```
validate → INSERT row → attempt email → UPDATE emailedAt | emailError → return state
```

**Insert before sending.** If the provider is down, rate-limits, or the key is
missing, the message is already durable and recoverable from Postgres. Sending
first and inserting after would lose messages on any provider hiccup — the exact
failure this section exists to avoid.

An email failure therefore does **not** fail the submission. The user sees
success, because from their side the message was in fact received; the failure is
recorded in `emailError` for the site owner.

### Validation

Hand-rolled, roughly fifteen lines. `zod` is not a dependency of this project and
three fields do not justify adding one.

| Field | Rule |
|---|---|
| `name` | required, trimmed, ≤ 100 chars |
| `email` | required, ≤ 200 chars, must contain a single `@` with text either side and a dot in the domain |
| `message` | required, trimmed, ≤ 5000 chars |

Errors return per-field so the form can mark the offending input. Validation runs
on the server; the client does not gate submission on its own checks.

### Spam

**A honeypot plus a timing check. No IP storage, no CAPTCHA.**

- A hidden input bots tend to fill. If it has content the action returns success
  without writing a row — a bot that is told it failed simply retries.
- A hidden timestamp of when the form was rendered. Submissions faster than two
  seconds are treated the same way.

IP-based rate limiting is deliberately excluded. It requires storing visitor IP
addresses — a privacy and retention obligation — to defend a portfolio contact
form against a threat that has not materialised. If spam does become real, the
proportionate escalation is Cloudflare Turnstile or a Postgres-backed per-IP
limit, added then.

### Email

Resend (`resend`), one new dependency, with `RESEND_API_KEY` added to
`.env.example`. Mail goes to the confirmed address, `hello@samklep.dev`.

**The key is optional at runtime.** If `RESEND_API_KEY` is unset the action still
inserts the row and records `email_error: "RESEND_API_KEY not set"`. This keeps
`npm run build`, CI, and a fresh clone working with no secrets — a form that
crashes the build on a missing env var would be a worse regression than the
problem it solves.

**Setup the site owner must do:** create the Resend key and verify a sending
domain. Until a domain is verified, Resend will only deliver to the account's own
address.

## Layer 2 — UI

Two components, so the client boundary stays as small as it can be:

| File | Type | Responsibility |
|---|---|---|
| `ContactSection.tsx` | server | Section shell, heading, and the right-hand panel |
| `ContactForm.tsx` | `"use client"` | The form alone — the only thing shipping JS |

### Layout

Two columns at `≥900px`, form left and panel right; one column below. The form
column is the wider of the two.

### Floating inputs

No boxes. Each field is a transparent input with a single hairline beneath it, so
it appears to float on the page rather than sit in a container — consistent with
the no-chrome approach the About section established directly above.

The label sits inside the empty field and lifts above it on focus or when the
field has content. This is pure CSS: `placeholder=" "` on the input, then
`:focus` and `:not(:placeholder-shown)` drive the transition. No JavaScript.

**Focus visibility needs care precisely because there is no box.** Focus changes
both the underline colour and the label colour to turquoise; the browser outline
is not removed without that replacement being clearly visible. The transition is
disabled under `prefers-reduced-motion`.

### States

- **Pending** — submit button disabled and labelled, driven by `useActionState`.
- **Success** — the form is replaced by a confirmation. Green is permitted here:
  the palette reserves it for status indicators, and a delivery confirmation is
  one.
- **Field errors** — pink, beneath the offending input, referenced by
  `aria-describedby` with `aria-invalid` on the input.

**Palette note:** the design system has no error colour. Turquoise is dominant,
pink is CTA, green is status-only. Pink covers both the submit button and error
text; they never appear in the same position, so the overlap is not ambiguous in
practice. Naming it here so it is a recorded decision rather than a silent
overload.

### Right-hand panel

Not a testimonial. There are none in the repo, the old site had none, and writing
one would be fabricated social proof — the same rule `CLAUDE.md` already applies
to metrics.

Instead, content that is true today: the green "available for work" pill reused
from `/contact`, a "What happens next" heading, and three numbered rows matching
the About section's `01/02/03` treatment so the two sections share a visual
language:

1. Every message is read personally.
2. A reply within two business days.
3. Rough scope and budget help but are not required.

Then a fallback line: prefer email? `hello@samklep.dev`.

The two-business-day figure is a commitment the site owner confirmed, not an
invention.

## Retiring `PlaceholderSection`

Contact is its last remaining user. Its own JSDoc says it should be deleted
outright rather than grown, so `PlaceholderSection.tsx` and its CSS module are
removed in this change.

That also removes the `:last-child` spacing trap `CLAUDE.md` currently warns
about for the footer: the stub keyed the page's bottom padding off being the last
child of `<main>`, which a future `<Footer />` would silently break.
`ContactSection` owns its own bottom padding — `8rem` — explicitly.

## Files

| File | Change |
|---|---|
| `src/db/schema.ts` | add `contactSubmissions` |
| `drizzle/00XX_*.sql` | generated migration, committed |
| `src/app/actions/contact.ts` | new server action |
| `src/lib/contactValidation.ts` | new — pure validation, no React or DB imports |
| `src/components/home/ContactSection.tsx` | new |
| `src/components/home/ContactSection.module.css` | new |
| `src/components/home/ContactForm.tsx` | new, client |
| `src/components/home/ContactForm.module.css` | new |
| `src/app/page.tsx` | swap the Contact stub for `<ContactSection />` |
| `src/components/home/PlaceholderSection.*` | deleted |
| `.env.example` | add `RESEND_API_KEY` |
| `package.json` | add `resend` |

Validation lives in its own module with no React and no database imports, so it
can be reasoned about — and later tested — independently of both.

## Verification

`npm run build` (type-checks and lints) plus manual checks against a running dev
server and database:

| Case | Expected |
|---|---|
| Valid submission | row in `contact_submissions`, success state shown |
| Invalid email | field error, **no row written** |
| Empty required field | field error, no row |
| Honeypot filled | success shown, **no row written** |
| Submitted under 2s | success shown, no row written |
| `RESEND_API_KEY` unset | row written, `email_error` recorded, no crash |
| Keyboard only | every field reachable, focus clearly visible without boxes |
| 375 / 768 / 1024 px | no horizontal overflow |

The narrow-width check is not optional: `globals.css` sets `overflow-x: hidden`,
so an overflowing field produces no scrollbar and no visible symptom. Assert
`document.body.scrollWidth <= window.innerWidth` rather than trusting the eye.

Do not run `npm run build` while `next dev` is running — it overwrites `.next`
and leaves the dev server throwing `MODULE_NOT_FOUND` against its own chunks.
