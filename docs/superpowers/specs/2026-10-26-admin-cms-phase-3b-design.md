# Admin CMS — Phase 3b: Projects & Posts List + Editor — Design

**Date:** 2026-10-26
**Status:** Approved, pending implementation plan
**Parent design:** `docs/superpowers/specs/2026-10-25-admin-cms-design.md` (Phase 3 section)
**Prior slice:** `docs/superpowers/specs/2026-10-25-admin-cms-phase-3a-design.md`

## Summary

Phase 3a delivered the signed-in admin shell and a read-only dashboard. The nav links
for **Projects** (`/admin/projects`) and **Posts** (`/admin/posts`) currently 404. This
slice builds those two screens: a list (with edit/delete) and a create/edit form for each.

Everything behind these screens already exists and is tested: the `/api/admin/projects`
and `/api/admin/posts` collection + item routes, the validators (`parseProjectInput` /
`parsePostInput` in `src/lib/validateAdmin.ts`), the transactional write path
(`upsertProjectWithTags` / `upsertPostWithTags` / `deleteProjectById` / `deletePostById`
in `src/db/content-write.ts`), and the typed client services (`ProjectService`,
`PostService` on `BaseApiService`, with `ProjectInput` / `PostInput` / `*RowDTO` in
`src/services/types.ts`). **3b is a UI build on finished, typed plumbing, plus one small
server-contract change** (the slug-collision 409 below).

`/admin/tags` and `/admin/submissions` remain out of scope — they are slice 3c.

## Routes & structure

New files under the authenticated `(dashboard)` route group (so they inherit the admin
shell and the `Cache-Control: no-store` + auth gate already applied there):

```
src/app/admin/(dashboard)/projects/page.tsx             list
src/app/admin/(dashboard)/projects/new/page.tsx         create form (thin wrapper)
src/app/admin/(dashboard)/projects/[id]/edit/page.tsx   edit form (thin wrapper)
src/app/admin/(dashboard)/posts/page.tsx                list
src/app/admin/(dashboard)/posts/new/page.tsx            create form (thin wrapper)
src/app/admin/(dashboard)/posts/[id]/edit/page.tsx      edit form (thin wrapper)
```

These are **client components** calling the Phase 2 services, per the parent design
(Phase 3 "Data flow"): the lists need client interactivity for delete, and the forms need
`useState` + mutation/loading state. This is a deliberate departure from the dashboard
page, which is a read-only server component — the distinction is interactivity, not
preference.

### Shared components (new, co-located under `(dashboard)`)

- **`ProjectForm` / `PostForm`** — one form component per resource. `new/page.tsx` renders
  it empty (mode: create); `[id]/edit/page.tsx` fetches the row via `service.get(id)`,
  shows a loading state, then renders it prefilled (mode: edit). The `new` and `[id]/edit`
  pages are thin wrappers so the form logic lives in one place per resource.
- A small reusable **list table** and a **`DeleteButton`** with a confirmation step
  (the parent design requires delete to confirm). The confirm can be an inline
  "click again to confirm" toggle or a lightweight modal — the plan picks the simpler one;
  no new dependency.

Styling: CSS Modules + the existing neon tokens, matching `(dashboard)/page.module.css`
and `layout.module.css`. No Tailwind, no new UI dependency (established project rules).

## The forms

Fields are exactly `ProjectInput` / `PostInput` from `src/services/types.ts` — nothing is
invented, and the set is authoritative because the validators and write path already
consume these shapes.

### Project form

- **Text inputs:** `slug`, `title`, `summary`, `category`, `role`, `dateLabel`,
  `liveUrl`, `repoUrl`, `coverImage`.
- **`status`** — a select; values `published` / `draft` (the only two in use; schema
  default `published`). On create the form defaults to `draft` so new work is not
  published by an empty field (see "Create defaults" below).
- **`featured`** — checkbox (boolean).
- **`sortOrder`** — number input (integer).
- **`startedAt` / `completedAt`** — `<input type="date">`; empty → `null`. Sent as
  date-only strings, matching the nullable columns.
- **`content`** — a monospace `<textarea>` holding the MDX/markdown body. No live
  preview (parent design: stretch goal, out of scope).
- **Tech/Design tab fields** — `techDescription`, `techTabImage`, `techTabImageAlt`,
  `designDescription`, `designTabImage`, `designTabImageAlt`, grouped under a labelled
  "Detail-page tabs" section so they read as the paired set they are.
- **`tech`** — a repeatable row editor: each row is `{ name, iconUrl }` (icon optional,
  `null` when blank), with add/remove. This maps to the project's tech tags; the write
  path upserts them as `kind: 'tech'` and relinks.

### Post form

- **Text inputs:** `slug`, `title`, `excerpt`, `coverImage`.
- **`status`** — select, same published/draft contract and `draft`-on-create default.
- **`featured`** — checkbox.
- **`publishedAt`** — `<input type="date">`; empty → `null`.
- **`readingMinutes`** — number input (integer). (Not auto-derived here; the importer
  computes it, but the admin form edits it directly for v1.)
- **`content`** — monospace MDX textarea.
- **`tags`** — a simple string list (chip/tag input): free-text topic names, deduped on
  entry. The write path upserts these as `kind: 'topic'`.

### Submit & error handling

- Create calls `service.save(input)`; edit calls `service.edit(id, input)`.
- The API validators already return specific `400 { error }` messages; `BaseApiService`
  normalizes every non-2xx to a typed `ApiError { status, message }`. The form surfaces
  that message as a toast. Toasts are fired from an effect keyed on the result, never from
  the render body (established project rule — a render-body toast double-fires under
  StrictMode).
- On success: toast, then navigate back to the list (`router.push`).

## Slug-collision → 409 (the one backend change)

The parent 3a doc deferred the create-collision contract to 3b. Today the create path is a
blind upsert-by-slug: `POST /api/admin/projects` → `upsertProjectWithTags` with no `id`
runs `onConflictDoUpdate` on `projects.slug`, so creating with an existing slug silently
overwrites that row. With Postgres now the source of truth, a typo'd slug can destroy real
content with no warning.

**Contract:** creating a project/post whose slug already exists returns **`409 Conflict`**;
the form shows "slug already in use." Editing an existing row (PUT by `id`) still updates
it, including no-op re-saves of its own slug.

**Mechanism** (details to the plan, but the shape is fixed):

- In `upsertProjectWithTags` / `upsertPostWithTags`, the `input.id === undefined` (create)
  branch switches from `onConflictDoUpdate` to `onConflictDoNothing().returning()`. An
  empty returned array means the slug already exists → throw a typed `SlugConflictError`
  (new, small, exported from `content-write.ts` or a sibling). The surrounding transaction
  rolls back, so no tags are touched on a rejected create.
- The two collection `POST` routes (`projects/route.ts`, `posts/route.ts`) catch
  `SlugConflictError` and return `409 { error: "A <resource> with that slug already exists" }`.
- The **PUT** (edit) branch is unchanged — it updates by `id` and never hits the conflict
  path, so re-saving a row keeps working.
- The **importer's** own upsert path is untouched: it calls the same functions but must
  keep overwriting by slug (it is the one-directional file→DB migration). Therefore the
  conflict-rejecting behavior must be gated to the *create-via-API* case, not applied
  unconditionally inside the write functions. The plan chooses the cleanest gate — either a
  flag parameter (e.g. `{ onSlugConflict: 'reject' | 'overwrite' }`, API passes `reject`,
  importer passes `overwrite`) or a thin API-only wrapper. Whichever is chosen, the importer
  idempotency test must still pass unchanged.

## Testing

Following the repo's `*.test.tsx` + vitest/testing-library conventions and the page-test
pattern (`vi.hoisted` + `vi.mock` of the service):

- **List pages:** render rows from a mocked `service.list()` (status, featured, dates,
  edit link, delete control); empty-list state renders.
- **Delete:** the `DeleteButton` requires a confirm step before calling
  `service.delete(id)`; a first click does not delete.
- **Forms:** create submits `service.save` with the assembled input; edit prefills from a
  mocked `service.get(id)` and submits `service.edit`; a rejected submit (mocked `ApiError`
  with `status: 409`) surfaces the slug error and does **not** navigate away; a
  `status: 400` validation error surfaces its message.
- **Route-level 409:** `POST` with a duplicate slug → `409`; `POST` with a fresh slug →
  `201`; `PUT` by id still updates (no false 409). These exercise the new
  `SlugConflictError` branch against the write path.
- **Importer regression:** the existing importer idempotency test still passes — the
  conflict gate must not change file→DB overwrite behavior.

Gate: new tests pass AND total failures stay ≤ the pre-existing baseline (the 3a baseline
was 5 unrelated `Timeline`/`about` failures; confirm the current baseline before counting).

**Verification:** `npm run build:verify` (never `npm run build` while `next dev` runs —
shared output dir strips site-wide CSS) with `npm run db:up` first (builds hit
`generateStaticParams` → Postgres).

## Out of scope (explicit)

- **`/admin/tags` and `/admin/submissions`** — slice 3c.
- **Live MDX preview** in the editor (parent design stretch goal).
- **Image upload** — `coverImage` / tab-image fields take a URL/path string; no upload
  pipeline.
- **`readingMinutes` auto-calculation** in the admin form (importer still computes it;
  the form edits the stored value directly).
- Reordering projects by drag — `sortOrder` is edited as a number for v1.

## Dependencies added

None. No new UI, styling, data, or auth dependencies.