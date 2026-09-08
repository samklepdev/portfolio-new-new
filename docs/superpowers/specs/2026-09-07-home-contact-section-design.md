# Home-page Contact section — design

Replaces the Contact `PlaceholderSection` stub with a working contact form on the
left and a real client testimonial on the right.

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
  budget: text("budget"),   // optional
  website: text("website"), // optional
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
| `budget` | optional, ≤ 100 chars |
| `website` | optional, ≤ 200 chars, **no format check** |
| `message` | required, trimmed, ≤ 5000 chars |

No format check on the website on purpose: `acme.com`, `www.acme.com` and a full
URL are all reasonable things to type, and guessing which is wrong would reject
valid input to buy nothing.

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

### Fields

Modelled on a Tailwind UI contact layout the site owner supplied as reference.
The visual design is matched; **Tailwind itself is not introduced** — this is
CSS Modules, as the project requires.

Labels sit **above** boxed inputs. Short fields pair into two columns at
`≥560px` and stack below it; the message spans both columns; the submit button
is full-width and filled.

| Field | Required |
|---|---|
| Name | yes |
| Email | yes |
| Budget | no |
| Website | no |
| Message | yes |

Budget and Website are optional by deliberate choice. Requiring a budget
disqualifies people who genuinely do not know it yet, and the form exists to
start a conversation rather than qualify a lead. Empty optional fields are
normalised to `NULL` rather than stored as empty strings.

The reference's "I agree to the privacy policy" line is **not** reproduced —
this site has no privacy policy, so the link would go nowhere.

Focus replaces the native outline with a turquoise border plus a 3px ring; a 1px
border change alone is too quiet to be the only focus indicator. The submit
button uses dark text on pink, not white: white on `#FF2E97` lands around 2.5:1
and fails contrast, while `#0B0E14` on it clears 8:1.

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

### Right-hand column

The green "available for work" pill reused from `/contact`, a real client
testimonial, and a fallback line offering the direct email.

**The testimonials are real and quoted verbatim.** They come from the old
samklep.dev and were supplied by the site owner. Nothing here is written or
paraphrased — an invented or reworded quote attributed to a named person is
fabricated social proof, which is the same rule `CLAUDE.md` applies to metrics,
only with someone else's name attached.

Currently shown:

> "I approached Sam with only a rough idea in mind and he helped me bring my idea
> to fruition. Sam helped with a logo, unique design & functional contact forms
> to keep up with customer demands."
>
> — Martha DeLeon, CEO, DeLeon Safety Solutions. 5 out of 5 stars.

Also on record, kept here so it is not lost. Swapping is a matter of changing the
`TESTIMONIAL` constant and the logo path beside it:

> "When we needed a website fast, Sam delivered what we needed in the time we
> needed it. From start to finish, all the features we needed to manage our
> social media presence were met."
>
> — Xavier Chavaria, Owner/Operator, Ultra Demolition. 5 out of 5 stars.

**No portrait.** The layout this was modelled on pairs each quote with a
photograph of the speaker. No photograph of either person exists in this repo,
and substituting a stock face for a real named client would misrepresent them.
The company logo carries the visual weight instead — knocked back to one white
with the same treatment as the client band, so a client's brand colours do not
compete with the page's accent.

The rating renders as five star glyphs with an `aria-label` carrying "5 out of 5
stars", so it is not decoration-only to a screen reader.

No surface and no border on this column. The form beside it already carries the
section's only boxes, and a panel here would compete with them.

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
| `src/lib/contactState.ts` | new — action state type and initial value |
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

The action state lives in `src/lib/contactState.ts` rather than beside the
action, because **a `"use server"` module may only export async functions**.
Exporting a plain `initialContactState` from it fails at runtime with "A 'use
server' file can only export async functions" — found by testing, not by
reading.

## Verification

`npm run build` (type-checks and lints) plus manual checks against a running dev
server and database:

| Case | Expected |
|---|---|
| Valid submission | row in `contact_submissions`, success state shown |
| Optional fields blank | row written with `budget` and `website` as **NULL**, not `""` |
| Optional fields filled | both stored verbatim, including a bare domain |
| Invalid email | field error, **no row written** |
| Empty required field | field error, no row |
| Honeypot filled | success shown, **no row written** |
| Submitted under 2s | success shown, no row written |
| `RESEND_API_KEY` unset | row written, `email_error` recorded, no crash |
| Keyboard only | every field reachable, focus ring clearly visible |
| 320 / 375 / 559 / 560 / 900 px | no horizontal overflow; fields stack below 560px, pair above it |

The narrow-width check is not optional: `globals.css` sets `overflow-x: hidden`,
so an overflowing field produces no scrollbar and no visible symptom. Assert
`document.body.scrollWidth <= window.innerWidth` rather than trusting the eye.

Do not run `npm run build` while `next dev` is running — it overwrites `.next`
and leaves the dev server throwing `MODULE_NOT_FOUND` against its own chunks.
