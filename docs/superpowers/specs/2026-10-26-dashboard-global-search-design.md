# Dashboard global search

**Date:** 2026-10-26
**Status:** Draft, pending approval

## Goal

Add a search bar pinned to the top of the `/admin` dashboard that searches
across all admin content — Projects, Posts, Tags, and Submissions — and shows
grouped, as-you-type results in a dropdown, each linking to that item's edit (or
detail) page. A fast way to jump straight to a record without first choosing
which list to open.

## Non-goals

- No change to the public site.
- No new search backend / database query / API route. Search runs client-side
  over data fetched from the existing admin endpoints (see Architecture).
- No fuzzy ranking, typo tolerance, or full-text search of long-form `content`.
  Matching is a case-insensitive substring over each record's human-identifying
  fields only (titles, names, slugs, emails).
- No global placement (the search lives on the dashboard page only, matching the
  TODO wording). The component is written to be reusable, but it is wired into
  the dashboard header in this spec, not the `AdminShell` top bar.

## Current state

- `src/app/admin/(dashboard)/page.tsx` — server component; renders the dashboard
  header (`.header`: eyebrow, `<h1>Dashboard</h1>`, intro, and a "View website"
  link) followed by metric cards and panels. Reads `getDashboardStats()`.
- Data access: one service per entity under `src/services/`, each a thin
  `BaseApiService` subclass exposing `.list()` →
  `GET /api/admin/<entity>` → `RowDTO[]`:
  - `ProjectService` → `ProjectRowDTO { id, slug, title, status, … }`
  - `PostService` → `PostRowDTO { id, slug, title, status, … }`
  - `TagService` → `TagListRowDTO { id, name, kind, … }`
  - `SubmissionService` → `SubmissionRowDTO { id, name, email, … }`
- These services are client-only (they call `fetch`), so any component using
  them is a client component. The list pages already do exactly this.

## Edit/detail routes (result link targets)

| Type        | Searchable fields | Link target                       |
|-------------|-------------------|-----------------------------------|
| Project     | title, slug       | `/admin/projects/{id}/edit`       |
| Post        | title, slug       | `/admin/posts/{id}/edit`          |
| Tag         | name              | `/admin/tags` (editing is inline on the list; there is no per-tag page) |
| Submission  | name, email       | `/admin/submissions/{id}`         |

## Architecture (Approach A: client-side aggregate)

A client `GlobalSearch` component fetches the four lists once on mount (in
parallel), holds them in state, and filters in memory as the user types. The
dashboard page stays a server component and simply renders `<GlobalSearch />` in
its header.

```
(dashboard)/page.tsx  (server)
  └─ header
       ├─ <GlobalSearch />          (client — owns query + results + open state)
       │    ├─ search input
       │    └─ results dropdown      (grouped: Projects / Posts / Tags / Submissions)
       ├─ eyebrow / <h1> / intro
       └─ "View website" link
```

### Component: `src/app/admin/(dashboard)/GlobalSearch.tsx` (client)

State:
- `data`: `{ projects, posts, tags, submissions }` — `null` until loaded.
- `query`: the current input string.
- `open`: whether the results dropdown is shown.
- `activeIndex`: keyboard-highlighted result (for ↑/↓/Enter).

Behavior:
- On mount, fetch the four `service.list()` calls in parallel with
  `Promise.allSettled` so one failing endpoint does not blank the others. For
  each rejected call, `toast.error` once (the list pages' convention) and treat
  that group as empty. A load is cheap and happens once; no re-fetch on open.
- Build a flat, memoized list of **result items** from `data`, each:
  `{ id, type, label, sublabel, href }`. `type` drives the group heading and a
  small type badge; `label`/`sublabel` are the primary and secondary text
  (e.g. Project → title / `/slug`; Submission → name / email).
- On each keystroke, filter result items by case-insensitive substring over
  `label + sublabel`, **cap each group at 5** (with a "+N more" affordance that
  links to that section's list page), and show them grouped in the dropdown.
  Query is trimmed; empty query closes the dropdown.
- Debounce the *filter* by ~150ms via a small timer so typing stays smooth even
  though filtering is synchronous and cheap (keeps keystroke→render off the
  critical path and makes the interaction feel deliberate). Debouncing is an
  internal detail; it does not change results.
- Keyboard: ↓/↑ move `activeIndex` across the flattened visible results, Enter
  navigates to the active result (`router.push(href)`), Escape closes and clears
  the highlight. Mouse hover sets `activeIndex`.
- Dismissal: click outside (a `pointerdown` listener on `document` while open,
  guarded by a container ref), route change, or Escape.
- Empty state inside the dropdown: when the query is non-empty and nothing
  matches, show "No matches for '{query}'." (interface voice, not an apology).

Accessibility:
- The input is a combobox: `role="combobox"`, `aria-expanded={open}`,
  `aria-controls` → the listbox id, `aria-activedescendant` → the active option id.
- Results list is `role="listbox"`; each result `role="option"` with a stable id
  and `aria-selected` on the active one. Group headings are presentational
  (`aria-hidden`), with the grouping also conveyed by option text.
- The input has an accessible name ("Search admin content") and a visible
  magnifier icon marked `aria-hidden`.

### Styling: `src/app/admin/(dashboard)/GlobalSearch.module.css`

Reuses the DataTable search-field language (same neon tokens): `#12161f`
surface, `#0b0e14` input, turquoise focus ring, rounded corners, the magnifier
icon inside the field. The dropdown is an absolutely-positioned `#12161f` card
(rounded, 1px `rgba(255,255,255,0.08)` border, shadow) below the input, with a
higher `z-index` than the metric cards, `max-height` + `overflow-y: auto`, group
headings in the muted uppercase micro-label style, and a turquoise-tinted
`aria-selected`/hover row. Respects `prefers-reduced-motion` (no open animation,
or an instant one). On mobile the dropdown is full-width under the input.

## Data flow

1. Dashboard (server) renders `<GlobalSearch />` in its header.
2. `GlobalSearch` (client) mounts → fetches four lists in parallel → stores rows.
3. User types → debounced in-memory filter → grouped results (≤5 per group).
4. User clicks a result or presses Enter on the highlighted one → `router.push`
   to that record's edit/detail route.

## Error handling

- A failed list fetch toasts an error and that group is simply absent from
  results; the other groups still work (independent `Promise.allSettled` per
  service so one failure does not blank the others).
- No results for a non-empty query → in-dropdown empty state, not an error.
- `router.push` to a valid admin route; no user-supplied URLs are ever
  constructed (hrefs are built from `type` + numeric `id`).

## Testing

`GlobalSearch.test.tsx` (mocking the four services as the list-page tests do,
and `next/navigation`'s `useRouter`; `react-toastify` mocked):
- Renders the search input (combobox) with its accessible name.
- Typing a query shows matching results grouped by type, linking to the correct
  edit/detail hrefs (assert a project, a post, a tag → `/admin/tags`, a
  submission).
- A query that matches nothing shows the in-dropdown empty state.
- Each group caps at 5 with a "+N more" link to the section list when exceeded.
- Enter on the highlighted result calls `router.push` with its href; Escape
  closes the dropdown.
- A rejected service `.list()` still renders results from the others (no crash).

The dashboard page test (`page.test.tsx`) gains one assertion: the search
combobox is present in the header. Its existing `getDashboardStats` mock is
unaffected; `GlobalSearch`'s own service calls are mocked there too (or the
component is allowed to mount with empty data — the page test only asserts the
input exists).

Note: jsdom has no layout, so the dropdown's positioning/scroll is verified by
loading the page, not by unit tests — tests assert state wiring, result
contents, hrefs, and a11y attributes only.

## Files

**New:**
- `src/app/admin/(dashboard)/GlobalSearch.tsx`
- `src/app/admin/(dashboard)/GlobalSearch.module.css`
- `src/app/admin/(dashboard)/GlobalSearch.test.tsx`

**Changed:**
- `src/app/admin/(dashboard)/page.tsx` — render `<GlobalSearch />` in `.header`.
- `src/app/admin/(dashboard)/page.module.css` — the search field spans the full
  width of a new top row in `.header`, above the existing title block + "View
  website" row, on all viewports. (One decisive placement, not responsive-
  conditional, to keep the header layout simple.)
- `src/app/admin/(dashboard)/page.test.tsx` — assert the combobox renders.

## Risks / watch-items

- **Client components under a server page:** `GlobalSearch` is `"use client"`;
  the dashboard stays a server component and only imports the component. Fine —
  the list pages already do this.
- **Outside-click + Next `<Link>`/router:** use `pointerdown` on `document`
  guarded by a container ref; clean up on unmount and when `open` flips false.
- **Touch `:hover`:** highlight is driven by `activeIndex` (set on hover and
  keyboard), not a `:hover`-latched style that drives layout, so the mobile
  hover-latch trap does not apply.
- **Tags have no edit page:** tag results link to `/admin/tags`; this is called
  out so it is not mistaken for a missing route.
- **Fetch-on-mount cost:** four small list calls on every dashboard load. At
  this data scale it is negligible; if it ever matters, Approach B (a single
  search endpoint) is the escape hatch, but it is out of scope here.
