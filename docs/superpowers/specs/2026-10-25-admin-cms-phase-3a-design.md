# Admin CMS — Phase 3a: Layout Isolation + Dashboard — Design

**Date:** 2026-10-25
**Status:** Approved, pending implementation plan
**Parent design:** `docs/superpowers/specs/2026-10-25-admin-cms-design.md` (Phase 3 section)

## Summary

Phase 3 (the admin UI) is built in three slices, each its own spec → plan → build:

- **3a (this doc)** — isolate `/admin` from the public site chrome, and build the admin
  shell + a read-only dashboard.
- **3b** — projects & posts list + create/edit form (MDX body, tag management).
- **3c** — tags inline CRUD + read-only submissions viewer.

3a delivers a working, signed-in admin shell with a dashboard of real stats, and the
structural change that lets every admin screen render without the marketing Header/Footer.
It writes nothing — all data flow is read-only.

## Problem

The root layout `src/app/layout.tsx` renders `<Header />` and `<Footer />` around **every**
route. `/admin` already has its own `src/app/admin/layout.tsx` (Phase 1), but it renders
*inside* the root layout, so the public marketing chrome still wraps every admin page. The
reveal-after-hero Header behavior is meaningless under `/admin`, and a `contentinfo` Footer
with résumé/social links does not belong on an authenticated tool. The admin also has no
dashboard — `/admin` is a Phase-1 "you are signed in" stub.

## Part 1 — Public route group (layout isolation)

**Approach:** a Next App Router route group for the public site; `/admin` renders under a
shrunk root layout with no chrome.

### Moves
Create `src/app/(site)/` and move the public route segments and their home-page support
files into it:

- `src/app/page.tsx` → `src/app/(site)/page.tsx`
- `src/app/page.module.css` → `src/app/(site)/page.module.css`
- `src/app/ProjectsSection.tsx` → `src/app/(site)/ProjectsSection.tsx`
- `src/app/about/` → `src/app/(site)/about/`
- `src/app/contact/` → `src/app/(site)/contact/`
- `src/app/projects/` → `src/app/(site)/projects/`
- `src/app/blog/` → `src/app/(site)/blog/`

Co-located test files move with their segments. Imports that use the `@/` alias
(e.g. `@/components/...`, `@/db/...`, `@/lib/...`) are unaffected by the move. Any
**relative** imports between moved files stay valid because the files move together; a
relative import from a moved file to a non-moved one (e.g. `src/app/actions`) must be
re-pointed or switched to the `@/` alias.

### New `src/app/(site)/layout.tsx`
Renders the public chrome:
```tsx
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
```

### Shrunk root `src/app/layout.tsx`
Keeps `<html>`/`<body>`, the three `next/font` variables, `<ToastContainer/>` (shared so
admin screens get toasts in 3b/3c), and the global CSS imports (`globals.css`, `toast.css`,
`react-toastify/dist/ReactToastify.css`). It renders only `{children}` between `<body>` tags
— no `Header`/`Footer`, and those two imports are removed. The site-wide `metadata`
(title/description) stays here.

### Stays at the app root (renders under the bare root layout)
`admin/`, `api/`, `actions/`, `favicon.ico`, `globals.css`, `layout.tsx`, `toast.css`.

### Invariants
- **URLs are unchanged.** Route groups `(name)` do not appear in the path: `(site)/page.tsx`
  is still `/`, `(site)/blog/[slug]` is still `/blog/[slug]`.
- Exactly one segment may map to `/` — the root `src/app/page.tsx` is **moved**, not copied.
- The project's CLAUDE.md rule still holds: never leave both `./app` and `./src/app`; this
  work is entirely within `src/app`.

## Part 2 — Admin shell

Flesh out `src/app/admin/layout.tsx` (currently a bare `<div>`) into the real shell:

- A slim top nav with links: **Dashboard** (`/admin`), **Projects** (`/admin/projects`),
  **Posts** (`/admin/posts`), **Tags** (`/admin/tags`), **Submissions**
  (`/admin/submissions`), and a **Sign out** control reusing the Phase-1
  `src/app/admin/LogoutButton.tsx`.
- Styled with the neon tokens as **CSS Modules** (extend `layout.module.css`) — no Tailwind,
  no new UI dependency.
- Keeps `export const metadata = { robots: { index: false, follow: false } }`.
- The nav renders the full link set now. Projects/Posts/Tags/Submissions have no pages until
  3b/3c, so those links 404 in the interim — acceptable, as 3b/3c land immediately after and
  the shell is the natural place to build the nav once. The active link is highlighted
  (client component reading `usePathname`), or a plain server-rendered nav if that is
  simpler; either is fine.

## Part 3 — Dashboard (`/admin` page)

`src/app/admin/page.tsx` becomes the dashboard — a **server component** that queries Postgres
directly (no API round-trip; read-only stats don't need the Phase-2 client services). It
renders four stat cards from new aggregate queries.

### Query module — `src/db/admin-dashboard.ts` (new)
Kept separate from the CRUD-focused `admin-queries.ts`. Exposes one function returning all
four stats in a single call (so the page does one await), e.g.:

```ts
export type DashboardStats = {
  projects: { total: number; published: number; draft: number };
  posts: { total: number; published: number; draft: number };
  submissionsLast30Days: number;
  recentSubmissions: { id: number; name: string; email: string; createdAt: Date }[]; // latest 5
  email: { delivered: number; failed: number; pending: number };
  tags: { tech: number; topic: number };
};

export async function getDashboardStats(): Promise<DashboardStats>;
```

Semantics:
- **Content counts:** `projects`/`posts` grouped by `status` (`published` vs. everything else
  counted as draft; the schema default is `published` and the only other value in use is
  `draft`).
- **Recent submissions:** `count(*)` where `created_at >= now() - interval '30 days'`, plus
  the latest 5 rows (id, name, email, createdAt) ordered `created_at desc, id desc`.
- **Email delivery:** of all `contact_submissions`, `delivered` = `emailed_at IS NOT NULL`;
  `failed` = `email_error IS NOT NULL`; `pending` = neither. (A row could in principle have
  both set across retries; for v1 count `failed` by `email_error IS NOT NULL` and `delivered`
  by `emailed_at IS NOT NULL AND email_error IS NULL` so the buckets don't double-count.)
- **Tag distribution:** `tags` grouped by `kind`.

Per the established repo convention, `admin-dashboard.ts` ships **without its own test**
(DB-access modules are verified through their mocked consumer page test + build; `queries.ts`
and the Phase-2 DB modules have no unit tests). No test-DB harness is introduced.

### Card rendering
Four cards (CSS Modules, neon tokens): Content, Recent submissions, Email health, Tag
distribution. The Recent-submissions card lists the latest few with name/email/relative date;
the full viewer is 3c. Email-health failures (e.g. "RESEND_API_KEY not set" recorded in
`email_error`) render in the pink/alert accent so a delivery problem is visible at a glance.
Dates are formatted with `Intl.DateTimeFormat` pinned to `timeZone: "UTC"` (the existing
project rule — `created_at` rendered server-side must not drift the visitor's zone and trip
hydration).

## Part 4 — Freshness (Phase 2 carry-over)

The Phase 1 review asked for `Cache-Control: no-store` on authenticated admin responses once
the dashboard carries real data. Set it centrally in `src/middleware.ts`, which already runs
on `/admin` and `/api/admin`: on a request that passes the auth check (a valid session), add
`Cache-Control: no-store` to the `NextResponse.next()` response headers for `/admin` and
`/api/admin` paths. The login redirect / 401 responses are unaffected.

## Testing

Following the existing `*.test.tsx` + vitest conventions:

- **Route-group move:** the existing public page tests move with their segments and must
  still pass unchanged (they exercise `/`, `/about`, `/contact`, `/blog`, `/projects`). A
  green `npm run build:verify` confirms every public URL still resolves after the move and
  that exactly one route maps to `/`.
- **Admin shell:** a test rendering the admin layout asserts the nav links are present
  (Dashboard/Projects/Posts/Tags/Submissions + Sign out) and that the public `Header`/`Footer`
  landmarks are **absent** under `/admin`.
- **Dashboard page:** a server-component page test mocking `getDashboardStats` (the repo's
  page-test pattern — `vi.hoisted` + `vi.mock("@/db/admin-dashboard")`) asserts the four
  cards render their numbers, and that an email `failed > 0` renders the alert treatment.
- **`admin-dashboard.ts`:** no isolated unit test (repo convention); covered by the mocked
  dashboard page test + build.
- **Cache-Control:** a `src/middleware.test.ts` case asserting a valid-session `/admin`
  request gets `Cache-Control: no-store`, and that an unauthenticated request still
  redirects/401s as before (no regression to the Phase-1 middleware tests).

**Verification:** `npm run build:verify` (never `npm run build` while `next dev` runs — shared
output dir strips site-wide CSS) with `npm run db:up` first (builds hit `generateStaticParams`
→ Postgres). Baseline is 5 pre-existing unrelated failures (`Timeline`/`about`); the gate is
new tests pass AND total failures stay ≤ 5.

## Out of scope (explicit)

- All create/edit forms, the MDX body editor, tag management UI (3b).
- Tags inline CRUD and the submissions list/detail viewer (3c).
- The create-collision contract (`POST` upsert-by-slug → 409 vs. intentional upsert), the
  default `status` on create, and validator hardening (bad `status`/date → 400, tag-name
  collision → 409). These are properties of the **create form**, so they are decided in 3b.
- Live MDX preview (stretch goal, may land later per the parent design).

## Dependencies added

None. No new UI, styling, data, or auth dependencies.
