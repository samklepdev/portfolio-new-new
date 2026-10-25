# Admin CMS — Design

**Date:** 2026-10-25
**Status:** Approved, pending implementation plan

## Summary

Add an authenticated admin section (`/admin`) that manages the site's resources as a
CMS: projects, posts, tags, and (read-only) contact submissions, plus a dashboard of
content and submission stats. Access is gated by a single-admin password → signed JWT
in an httpOnly cookie, enforced by `src/middleware.ts`. The admin reads and writes
through an `/api/admin/[resource]` route layer, consumed by a typed service layer built
on `BaseApiService`.

## Governing-decision reversal (read this first)

The current `CLAUDE.md` records: *"The governing decision: no build-your-own CMS …
There is no admin CRUD app and adding one would undo the point of the rebuild."* The data
flow is one-directional — MDX files are the source of truth, `db:seed` imports them into
Postgres as a queryable index, and nothing else writes to the DB.

**This project deliberately reverses that decision.** Postgres becomes the source of
truth; the admin is the CMS. `CLAUDE.md` MUST be updated as part of Phase 0 so a future
`db:seed` is never treated as authoritative and never clobbers admin edits. This is the
single most consequential change in the project — if the doc is not updated, the whole
design is a trap for the next person (or the next session).

## Phasing

Built strictly in dependency order:

- **Phase 0 — Source-of-truth migration** (must land first)
- **Phase 1 — Auth & middleware**
- **Phase 2 — Service & API layer**
- **Phase 3 — Admin UI & dashboard**

---

## Phase 0 — Source-of-truth migration

### Schema changes
`src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate` (never hand-edit
`drizzle/*`):

- `projects.content: text` — nullable (so the migration applies before backfill), holds
  the MDX/markdown body.
- `posts.content: text` — same.

No other column changes. `tags`, `project_metrics`, `project_tags`/`post_tags`, and
`contact_submissions` are already shaped for the admin's needs.

### Importer — `src/db/import-content.ts`
A one-time cutover script, kept afterward for reference:

- Reads every `src/content/projects/*.md` and `src/content/posts/*.md` via `gray-matter`
  (frontmatter + body), including the two currently-untracked `pi-hosted-*` posts.
- Upserts rows **by `slug`** with `onConflictDoUpdate` (NOT `onConflictDoNothing` —
  `.returning()` yields nothing on a do-nothing conflict and silently breaks downstream
  tag linking; this is an existing project rule).
- Writes frontmatter → columns and body → `content`.
- Re-links tags through the shared `tags` table, preserving the `kind: 'tech'` vs
  `'topic'` identity rule, the global uniqueness of `tags.name`, and the orphan-tag
  cleanup that checks **both** `project_tags` and `post_tags` (checking only
  `project_tags` once deleted every topic tag and cascaded away post/tag links).
- Imports `client` from `src/db/index.ts` and `await client.end()` — does not
  `process.exit()` out from under an open socket.
- Fails loudly (non-zero exit) on a malformed file rather than skipping it silently.

### Read-path cutover
- Project and post detail pages render the body from the `content` **column** via
  `next-mdx-remote`, instead of reading files through `src/lib/content.ts`.
- `src/lib/content.ts` is retired, or reduced to shared helpers used only by the importer.
- After the importer runs, the `.md` files may be deleted or left as a backup; the DB is
  authoritative either way.
- `generateStaticParams` for `/projects/[slug]` and `/blog/[slug]` continues to query
  Postgres (already the case) — builds still need `npm run db:up`.

### Seed + docs
- `db:seed` is repurposed to **dev-only bootstrap** (a couple of sample rows for a fresh
  database), explicitly not the real content, so re-running it never overwrites production
  data. It stays idempotent (`onConflictDoUpdate`).
- `CLAUDE.md` updated: the "no CMS / MDX is source of truth" sections are rewritten to
  state that Postgres is the source of truth and `/admin` is the CMS, and that `db:seed`
  is dev bootstrap only.

---

## Phase 1 — Auth & middleware

### Secrets (env; documented in `.env.example`)
- `ADMIN_PASSWORD_HASH` — scrypt hash of the admin password (Node `crypto`, no new dep).
- `ADMIN_JWT_SECRET` — signing secret for the session JWT.

### Login flow
- `/admin/login` — minimal client form (neon tokens, CSS Modules), posts to
  `POST /api/admin/login`.
- Login route verifies the password against `ADMIN_PASSWORD_HASH`; on success signs a
  short-lived JWT (`jose`, ~12h expiry, `sub: "admin"`) and sets it as an **httpOnly,
  Secure, SameSite=Lax** cookie named `admin_session`.
- `POST /api/admin/logout` clears the cookie.

### Gate — `src/middleware.ts`
- `matcher` covers `/admin/:path*` and `/api/admin/:path*`, **excluding** `/admin/login`
  and `/api/admin/login` (otherwise the login form is unreachable).
- Verifies the cookie JWT with `jose` (Edge-compatible — the reason for `jose` over
  `jsonwebtoken`).
- Invalid / expired / missing token: **pages** redirect to `/admin/login?from=…`;
  **`/api/admin/*`** returns `401 { error }` (so `BaseApiService` surfaces it rather than
  trying to follow a redirect inside `fetch`).
- The cookie is httpOnly and sent automatically on same-origin requests, so the service
  layer never reads or attaches the token.

### Defense in depth
Each `/api/admin/*` route handler ALSO performs a lightweight auth check, so a route is
never left unprotected if a `matcher` edit ever slips.

---

## Phase 2 — Service & API layer

### API routes
`src/app/api/admin/[resource]/route.ts` and `[resource]/[id]/route.ts`, for
`resource ∈ {projects, posts, tags, submissions}`:

- Collection route: `GET` (list), `POST` (create). Item route: `GET`, `PUT`, `DELETE`.
- Each handler: re-checks auth → validates the body with a per-resource TypeScript guard
  + small `validate` helper (no `zod` unless later chosen) → calls Drizzle.
- Writes to `projects`/`posts` go through the **same slug-upsert + tag-relink code path**
  the importer uses — one write path, reused by import and admin. The write + tag relink
  are wrapped so a failure never leaves half-linked rows.
- `submissions` is **read-only**: `GET` list + `GET` item only. No create/update/delete,
  and the view never re-introduces a writable `company`-like field (the form honeypot is
  deliberately named `referralCode`; `company` is autofilled by Chrome).

### `BaseApiService` cleanup
`src/services/BaseApiService.ts` is finished:

- **Relative base URL.** Drop `NEXT_PUBLIC_BASE_URL`; default `baseURL` to `/api/admin`
  so calls are same-origin and the httpOnly cookie is sent automatically. Remove the
  duplicated `baseURL` (currently set in both `axios.create` and `buildAxiosConfig`).
- **Error normalization.** Non-2xx responses (middleware 401, validation 400, etc.)
  become a typed `ApiError { status, message }` the UI shows in a toast, instead of a raw
  axios throw.
- **Consistency fix.** `delete` must `encodeURIComponent(id)` like `update` does.
- **Input/output types.** `create`/`update` take distinct input vs. output generics where
  the payload differs from the stored row, keeping the generic ergonomics.

### Per-resource services
`ProjectService`, `PostService`, `TagService`, `SubmissionService` extend
`BaseApiService`, binding their endpoint and adding resource-specific types/helpers. This
is the reusable-service payoff: new services are a few lines each.

---

## Phase 3 — Admin UI & dashboard

### Isolation
`src/app/admin/layout.tsx` is its own layout — NOT the public `Header`/`Footer` chrome
(their reveal-after-hero behavior is meaningless here). It renders a slim admin nav + a
logout button, styled with the existing neon tokens as CSS Modules (no Tailwind, no new UI
dependency). Everything under `/admin` carries `robots: noindex` and stays out of the
public sitemap/nav.

### Screens
- `/admin/login` — outside the gate (Phase 1).
- `/admin` — **dashboard**. Stat cards derived from Postgres: projects/posts counts by
  status, draft count, tag distribution, contact submissions over the last 30 days, email
  delivery success/failure counts (from `emailedAt` / `emailError`). Read functions live
  in a new `src/db/admin-queries.ts`, kept separate from the public `queries.ts`.
- `/admin/projects` & `/admin/posts` — list (status, featured, dates, edit/delete) +
  create/edit form. The form edits metadata fields AND the MDX body in a monospace
  textarea; tags managed inline. Live MDX preview is a **stretch goal**, not required for
  v1.
- `/admin/tags` — list + inline create/edit (name, kind, icon), respecting the shared
  `tags.name` uniqueness and the `tech`/`topic` kind rule.
- `/admin/submissions` — read-only list + detail of `contact_submissions`, showing
  delivery status.

### Data flow
Admin screens are client components calling the Phase 2 services for lists and mutations,
with loading/error states surfaced through the existing `react-toastify` setup
(`<ToastContainer />` already in `layout.tsx`; toasts fired from effects, not render
bodies — an existing project rule). Delete actions require a confirmation step.

---

## Testing & error handling

Following the existing `*.test.tsx` + testing-library/jest conventions:

- **Auth (highest-risk, tested hardest).** JWT sign/verify helper: valid, expired,
  tampered, missing. Middleware decision: page → redirect to `/admin/login`;
  `/api/admin/*` → `401` json. Login route: correct password → cookie set; wrong → 401, no
  cookie; `/admin/login` reachable while unauthenticated.
- **Importer.** Idempotency: run twice over fixtures, assert rows and tag-links are stable
  (exercises the `onConflictDoUpdate` + both-join orphan-cleanup rules).
- **API routes.** Unauthenticated request rejected by the per-route check even with
  middleware mocked out; bad bodies → 400; happy-path CRUD round-trips through Drizzle
  against the test DB.
- **`BaseApiService`.** Non-2xx normalized to a typed `ApiError`, not a raw throw; both
  `delete` and `update` encode the id.
- **Render path.** A detail page renders the MDX body from the `content` column.
- **Admin pages.** List renders rows; edit form submits through its (mocked) service;
  delete requires confirmation.

**Error-handling principles:** middleware never leaks why auth failed beyond
401/redirect; validation errors are specific and surfaced as toasts; a failed write never
partially links tags; the importer fails loudly rather than skipping a malformed file.

**Verification:** use `npm run build:verify` (never `npm run build` while `next dev` runs
— shared output dir strips site-wide CSS) and `npm run db:up` before any build that hits
`generateStaticParams`.

## Dependencies added

- `jose` — Edge-compatible JWT sign/verify (required by middleware).
- `axios` — already added in the working tree for `BaseApiService`.

No new UI, styling, or auth-framework dependencies.

## Out of scope (explicit)

- Multi-user accounts / roles (single admin only).
- Self-hosted pageview tracking or third-party analytics — dashboard stats derive solely
  from existing Postgres data.
- Live MDX preview in the editor (stretch goal, may land later).
