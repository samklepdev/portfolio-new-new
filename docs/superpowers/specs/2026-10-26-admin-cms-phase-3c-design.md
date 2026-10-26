# Admin CMS Phase 3c: Tags & Submissions — Design

**Date:** 2026-10-26
**Status:** Approved

## Goal

Build the two remaining admin screens promised by the admin CMS design
(`2026-10-25-admin-cms-design.md`, lines 185–188):

- `/admin/tags` — list + **inline** create/edit (name, kind, icon), respecting the
  shared `tags.name` uniqueness and the `tech`/`topic` kind rule.
- `/admin/submissions` — **read-only** list + detail of `contact_submissions`, showing
  email-delivery status.

Both sit under the authenticated `(dashboard)` route group and consume the Phase 2
API/services, which already exist and are tested. This phase is almost entirely UI; the
one backend change is read-time tag usage counts.

## Context — what already exists

- **API routes** (`src/app/api/admin/…`): tags collection `GET`/`POST` and item
  `GET`/`PUT`/`DELETE`; submissions `GET` list + `GET` item only (read-only by design —
  no create/update/delete, and the view never reintroduces a writable `company`-like
  field; the contact form's honeypot is deliberately named `referralCode`).
- **Services**: `TagService` (`list`/`save`/`edit`, and `delete` inherited from
  `BaseApiService`) and `SubmissionService` (`list`/`get`). No service method needs
  adding.
- **DB reads** (`src/db/admin-queries.ts`): `listTags` (ordered `kind, name`),
  `getTagById`, `listSubmissions` (newest first), `getSubmissionById`.
- **DTOs** (`src/services/types.ts`): `TagInput { name, kind, iconUrl }`,
  `TagRowDTO { id, name, kind, iconUrl }`, `SubmissionRowDTO { id, name, email, budget,
  website, message, createdAt, emailedAt, emailError }`.
- **UI primitives**: `DeleteButton` (confirm-then-delete), `FormFields`
  (`TextField`/`SelectField`/…), `list.module.css`, `editor.module.css`.
- **AdminNav** currently omits the Tags and Submissions links (removed in 3b because the
  pages did not exist). Delivery-status derivation (`emailedAt` → delivered,
  `emailError` → failed, else pending) is already modelled on the dashboard.

## Decisions (resolved during brainstorming)

1. **Tags editing is inline**, not separate editor pages. Tags are three fields; a single
   list page with in-row editing and a create row is lighter than per-tag navigation and
   matches the spec's wording.
2. **Tag delete surfaces usage.** Deleting a tag cascades (`project_tags`/`post_tags` are
   `ON DELETE CASCADE`), silently unlinking it from content. The list shows a usage count
   and the delete confirmation names the impact when the count is non-zero.
3. **Submissions use a separate detail page** (`/admin/submissions/[id]`) with a `mailto:`
   reply link — consistent with the `getById` endpoint — rather than expand-in-place.

## Architecture

### Backend — tag usage counts (only non-UI change)

- `src/db/admin-queries.ts`: `listTags()` returns each tag plus `projectCount` and
  `postCount`, computed by counting `project_tags` / `post_tags` rows per tag
  (left-join + group-by, or correlated subqueries). Ordering stays `asc(kind), asc(name)`.
  `getTagById` is unchanged (counts are a list-only concern; inline editing never calls
  `getById`).
- `src/services/types.ts`: add `TagListRowDTO = TagRowDTO & { projectCount: number;
  postCount: number }`. `TagRowDTO` (returned by create/edit/getById) is unchanged.
- `src/services/TagService.ts`: `list()` return type becomes `Promise<TagListRowDTO[]>`.
  No new methods.
- No schema change, no `drizzle/` migration — counts are read at query time.

### `/admin/tags` — list with inline create/edit

`src/app/admin/(dashboard)/tags/page.tsx` (client) + `tags.module.css`.

- Loads `TagService.list()` into state; renders a table: **Name · Kind · Used by · Icon ·
  actions**, sorted `kind, name` (as returned).
- **New-tag row** at the top: `TextField` (name), `SelectField` (kind: tech/topic),
  `TextField` (icon URL, optional) → `service.save({ name, kind, iconUrl })`.
- **Edit** on a row swaps its cells for the same inputs with **Save/Cancel** →
  `service.edit(String(id), input)`. Edit state is per-row (one row editable at a time is
  sufficient; the page tracks the editing id).
- **Delete** uses the existing `DeleteButton`, minimally extended with an optional
  `confirmLabel` prop (defaulting to the current hardcoded `"Confirm?"`). When
  `projectCount + postCount > 0` the tags page passes a usage-aware message
  (e.g. `"Unlinks from 3 projects, 1 post — confirm?"`); otherwise the plain `"Confirm?"`
  is used. The two-click arm/confirm behaviour is otherwise unchanged, and existing
  `DeleteButton` call sites (projects/posts lists) keep working via the default.
- After every create/edit/delete the page **refetches the list** so counts and ordering
  stay correct. Errors (duplicate name, validation) surface via `toast.error` using
  `ApiError.message`; successes via `toast.success`. Toasts fire from async handlers, never
  a render body.

### `/admin/submissions` — read-only list + detail

- `submissions/page.tsx` (client): `SubmissionService.list()` → table of **Name · Email ·
  Received · Status**, where Status is a badge derived as delivered (`emailedAt` set and no
  `emailError`) / failed (`emailError` set) / pending (neither). Each row links to
  `/admin/submissions/[id]`.
- `submissions/[id]/page.tsx` (client): unwraps `params` with `use()`, calls
  `SubmissionService.get(id)`, and shows name, email with a **`mailto:` Reply** link,
  budget, website, received + delivered timestamps, any `emailError`, and the full message.
  No write controls. Dates via `Intl.DateTimeFormat` pinned to `timeZone: "UTC"`.
- Shares `list.module.css`; a small `submissions.module.css` (or reuse of `editor`) covers
  the detail layout and status badge.

### Nav

- Restore the `Tags` and `Submissions` entries in `AdminNav` `LINKS` and update
  `AdminNav.test.tsx` to assert all five links render again.

## Data flow

Browser (client page) → `TagService`/`SubmissionService` (axios, same-origin, httpOnly
cookie) → `/api/admin/{tags,submissions}` routes (`requireAdmin` + validation) → Drizzle
reads/writes. The tags page is the only writer; submissions is read-only end to end.

## Error handling

- Service calls that reject surface as `ApiError`; pages show `err.message` via toast
  (lists/mutations) or inline where a form context exists.
- Tags: duplicate name / invalid kind come back as `400` from `parseTagInput` → toast; the
  inline row stays open so the value isn't lost.
- Submissions detail: a missing id yields the route's `404` → `ApiError` → a "Not found"
  toast and an empty/placeholder state.

## Testing

TDD, mirroring Phase 3b. Gate: new tests pass and total suite failures stay ≤ the
pre-existing `Timeline`/`about` baseline (~5).

- **`admin-queries`**: `listTags` returns correct `projectCount`/`postCount` for tags used
  by projects, by posts, by both, and by neither.
- **Tags page**: renders a row per tag with its counts; the new-tag row saves through
  `service.save`; Edit→Save round-trips through `service.edit`; delete-confirm wording
  reflects usage; the list refetches after a mutation.
- **`DeleteButton`**: a case for the new `confirmLabel` prop (armed state shows the custom
  message), and the default still shows `"Confirm?"`.
- **Submissions list**: renders a row per submission with the correct delivery badge for
  delivered/failed/pending.
- **Submissions detail**: prefills fields and renders the `mailto:` link; uses the awaited
  `act` + `<Suspense>` render pattern established in 3b for `use(params)` pages.
- **AdminNav**: all five links render.

## Out of scope

No tag merge/rename-cascade tooling; no submission delete/export/archival; no pagination
(volumes are small); no schema/`drizzle` migration; no live preview. Nothing starts
filtering tags by `kind` as an identity (the composite `(name, kind)` identity remains a
tracked follow-up).
