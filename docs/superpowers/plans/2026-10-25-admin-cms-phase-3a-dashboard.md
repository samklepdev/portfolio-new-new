# Admin CMS — Phase 3a: Layout Isolation + Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate `/admin` from the public marketing chrome via a route group, then build the admin shell (nav + sign-out) and a read-only dashboard of real Postgres stats.

**Architecture:** Public pages move into a `src/app/(site)/` route group whose layout renders `<Header/>`/`<Footer/>`; the root layout shrinks to `<html>/<body>` + fonts + `<ToastContainer/>` + global CSS, so `/admin` (outside the group) renders chrome-free. The dashboard is a server component querying Postgres directly through a new `src/db/admin-dashboard.ts` aggregate module. Authenticated `/admin` responses get `Cache-Control: no-store` set centrally in the existing Edge middleware.

**Tech Stack:** Next.js 15.5 (App Router, route groups, Edge middleware) · React 19 · TypeScript · Drizzle ORM + `postgres` · CSS Modules · vitest + @testing-library/react.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-25-admin-cms-phase-3a-design.md`. Parent: `docs/superpowers/specs/2026-10-25-admin-cms-design.md` (Phase 3). Phases 0–2 are merged on `main`; this branch is `feat/admin-dashboard` (cut from `main`, already carries the 3a spec commit `094b80a`).
- **Styling is CSS Modules, never Tailwind.** No new dependencies of any kind.
- **Route groups do not change URLs.** `(site)/page.tsx` is still `/`, `(site)/blog/[slug]` is still `/blog/[slug]`. Exactly one segment may map to `/` — the home page is MOVED, not copied. Never leave both `./app` and `./src/app` (all work is within `src/app`).
- **DB-access modules ship WITHOUT their own `*.test.ts`** — repo convention (`src/db/queries.ts` and the Phase-2 DB modules have none; no test-DB harness). `admin-dashboard.ts` is verified through its mocked consumer page test + `build:verify`. Do not stand up a test database.
- Server-rendered dates use `Intl.DateTimeFormat` pinned to `timeZone: "UTC"` (existing project rule — avoids server/visitor zone drift and hydration mismatch).
- `<ToastContainer/>` stays in the shared root layout (admin screens in 3b/3c need it).
- Test runner is **vitest** (`npx vitest run <path>`). Async server-component pages are tested by `render(await PageComponent(props))` — the established pattern in `src/app/**/page.test.tsx`. DB/query modules are mocked with `vi.hoisted()` + `vi.mock("@/db/...")`.
- **Baseline: 5 pre-existing failures** (`src/app/.../about/page.test.tsx` + `src/components/about/Timeline.test.tsx`, a timeline-date bug unrelated to this work). Per-task gate: new tests pass AND total failures stay ≤ 5. **Note:** the about test path changes in Task 1 (it moves into `(site)`), but it remains one of the 5.
- Never `npm run build` while `next dev` runs — use `npm run build:verify` (isolated `.next-verify`); `npm run db:up` first (builds hit `generateStaticParams` → Postgres).
- `npx tsc --noEmit` always exits non-zero here from pre-existing vitest-ambient-type errors in `*.test.ts` files only; judge a file's type-health by "no tsc error references my file" (grep), not the exit code.
- Commit trailer (exact): `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Untracked `src/content/posts/pi-hosted-*.md` exist — do NOT stage them. Use explicit pathspecs on every `git add`; never `git add -A`.

## File Structure

- `src/app/(site)/layout.tsx` — public chrome (Header/Footer). **New.**
- `src/app/(site)/page.tsx`, `page.module.css`, `ProjectsSection.tsx`, `about/`, `contact/`, `projects/`, `blog/` — **Moved** from `src/app/` (co-located tests move too).
- `src/app/layout.tsx` — shrunk to `<html>/<body>` + fonts + toasts + global CSS. **Modify.**
- `src/app/admin/layout.tsx` — real shell (renders `<AdminNav/>` + children). **Modify.**
- `src/app/admin/AdminNav.tsx` + `AdminNav.module.css` — client nav with active-link + sign-out. **New.** Test: `AdminNav.test.tsx`.
- `src/app/admin/layout.module.css` — extend for the shell. **Modify.**
- `src/db/admin-dashboard.ts` — `getDashboardStats()` aggregates. **New.**
- `src/app/admin/page.tsx` + `page.module.css` — the dashboard (replaces the Phase-1 stub). **Modify/New.** Test: `page.test.tsx`.
- `src/middleware.ts` — add `Cache-Control: no-store` on the authed pass-through. **Modify.** Test: extend `src/middleware.test.ts`.

---

### Task 0: Baseline

**Files:** none (measurement only).

- [ ] **Step 1: Confirm branch + baseline**

Run: `git branch --show-current && npm run db:up && npx vitest run 2>&1 | tail -4`
Expected: branch is `feat/admin-dashboard`; suite reports `5 failed | <N> passed` (the 5 pre-existing `Timeline`/`about` failures). Record the pass count. If failures ≠ 5, stop and surface it.

- [ ] **Step 2: Confirm the working tree**

Run: `git status --short`
Expected: only untracked `src/content/posts/pi-hosted-*.md` (and scratch). Nothing else dirty.

---

### Task 1: Public route group + shrunk root layout

**Files:**
- Create: `src/app/(site)/layout.tsx`
- Move: `src/app/page.tsx`, `src/app/page.module.css`, `src/app/ProjectsSection.tsx`, `src/app/about/`, `src/app/contact/`, `src/app/projects/`, `src/app/blog/` → under `src/app/(site)/`
- Modify: `src/app/layout.tsx`, and `src/app/(site)/page.tsx` (one import)

**Interfaces:**
- Produces: the public site under `(site)/` with its own chrome layout; a chrome-free root layout. No exported symbols other tasks consume.

- [ ] **Step 1: Move the public segments into the group (preserve git history)**

```bash
cd src/app
mkdir -p "(site)"
git mv page.tsx "(site)/page.tsx"
git mv page.module.css "(site)/page.module.css"
git mv ProjectsSection.tsx "(site)/ProjectsSection.tsx"
git mv about "(site)/about"
git mv contact "(site)/contact"
git mv projects "(site)/projects"
git mv blog "(site)/blog"
cd ../..
```
Expected: `git status` shows these as renames. `src/app/` now contains `(site)/`, `admin/`, `api/`, `actions/`, `favicon.ico`, `globals.css`, `layout.tsx`, `toast.css` — and NO stray `page.tsx`/`about`/etc. at the top level.

- [ ] **Step 2: Fix the self-referential alias import**

`src/app/(site)/page.tsx` imports `ProjectsSection` via `@/app/ProjectsSection`, which no longer exists. Edit that line:
```ts
import ProjectsSection from "@/app/(site)/ProjectsSection";
```
Then confirm nothing else references the old paths:
```bash
grep -rn '@/app/ProjectsSection\|@/app/page' src --include=*.ts --include=*.tsx
```
Expected: the only hit is the line you just fixed (now pointing at `(site)`). If any other file references a moved path via `@/app/...`, update it to the `(site)` path. (The move grep earlier found no risky relative `../` imports — everything else uses stable `@/components`, `@/db`, `@/lib` aliases.)

- [ ] **Step 3: Create the site chrome layout**

Create `src/app/(site)/layout.tsx`:
```tsx
import React from "react";
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

- [ ] **Step 4: Shrink the root layout**

Replace `src/app/layout.tsx` with (removes the `Header`/`Footer` imports and their render; keeps everything else):
```tsx
import React from "react";
import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import "./toast.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sam Klepper",
  description: "Full-stack engineer — TypeScript, React, C#",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        {children}
        <ToastContainer theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Run the moved suite + build to verify the move**

Run: `npx vitest run src/app 2>&1 | tail -6`
Expected: the moved page tests (`(site)/about/page.test.tsx`, `(site)/blog/**`, `(site)/projects/**`, `(site)/contact/**`) run from their new paths; total failures unchanged (the about/Timeline ones remain the baseline). No "cannot find module" from a stale import.

Run: `npm run db:up && npm run build:verify 2>&1 | tail -30`
Expected: build succeeds; the route table lists `/`, `/about`, `/contact`, `/projects`, `/projects/[slug]`, `/blog`, `/blog/[slug]`, `/admin`, `/admin/login` with the SAME paths as before (no `(site)` in any URL). No "two pages resolve to /" error.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(site)" src/app/layout.tsx
git commit -m "Move public pages into a (site) route group; strip chrome from root layout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
(The `git mv`’d files are staged as renames by `git add "src/app/(site)"`; verify `git status` shows no leftover top-level `page.tsx`/`about`/etc. before committing.)

---

### Task 2: Admin shell (nav + sign-out)

**Files:**
- Create: `src/app/admin/AdminNav.tsx`, `src/app/admin/AdminNav.module.css`
- Test: `src/app/admin/AdminNav.test.tsx`
- Modify: `src/app/admin/layout.tsx`, `src/app/admin/layout.module.css`

**Interfaces:**
- Consumes: the Phase-1 `src/app/admin/LogoutButton.tsx` (client; `POST /api/admin/logout` then redirect).
- Produces: `AdminNav` (default export, client component) rendering the five admin links + the logout control; `AdminLayout` rendering `<AdminNav/>` above `{children}`.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/AdminNav.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminNav from "./AdminNav";

describe("AdminNav", () => {
  it("renders all five admin links and a sign-out control", () => {
    mocks.usePathname.mockReturnValue("/admin");
    render(<AdminNav />);
    for (const label of ["Dashboard", "Projects", "Posts", "Tags", "Submissions"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("marks the link matching the current path as current", () => {
    mocks.usePathname.mockReturnValue("/admin/projects");
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("treats /admin as current only on the exact dashboard path", () => {
    mocks.usePathname.mockReturnValue("/admin/posts");
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/admin/AdminNav.test.tsx`
Expected: FAIL — cannot resolve `./AdminNav`.

- [ ] **Step 3: Write `AdminNav`**

Create `src/app/admin/AdminNav.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import styles from "./AdminNav.module.css";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/submissions", label: "Submissions" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className={styles.nav} aria-label="Admin">
      <div className={styles.brand}>Admin</div>
      <ul className={styles.links}>
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={styles.link}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className={styles.spacer} />
      <LogoutButton />
    </nav>
  );
}
```

Create `src/app/admin/AdminNav.module.css`:
```css
.nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid rgba(0, 240, 255, 0.15);
  background: #12161f;
}
.brand {
  font-family: var(--font-display, inherit);
  font-weight: 700;
  color: #00f0ff;
  letter-spacing: 0.02em;
}
.links {
  display: flex;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.link {
  color: #aab2c0;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.25rem 0;
  border-bottom: 2px solid transparent;
}
.link:hover {
  color: #f5f7fa;
}
.link[aria-current="page"] {
  color: #f5f7fa;
  border-bottom-color: #00f0ff;
}
.spacer {
  flex: 1;
}
```

- [ ] **Step 4: Wire the layout**

Replace `src/app/admin/layout.tsx`:
```tsx
import type { Metadata } from "next";
import AdminNav from "./AdminNav";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Admin — Sam Klepper",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <AdminNav />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
```

Append to `src/app/admin/layout.module.css`:
```css
.content {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
```

- [ ] **Step 5: Run the test + full suite**

Run: `npx vitest run src/app/admin/AdminNav.test.tsx`
Expected: PASS (3 tests).
Run: `npx vitest run 2>&1 | tail -4`
Expected: total failures still ≤ 5.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/AdminNav.tsx src/app/admin/AdminNav.module.css src/app/admin/AdminNav.test.tsx src/app/admin/layout.tsx src/app/admin/layout.module.css
git commit -m "Add admin shell nav (active link + sign out)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Dashboard aggregate queries

**Files:**
- Create: `src/db/admin-dashboard.ts`

**Interfaces:**
- Consumes: `db` from `src/db/index.ts`; `projects`, `posts`, `tags`, `contactSubmissions` from `src/db/schema.ts`.
- Produces:
  ```ts
  export type DashboardStats = {
    projects: { total: number; published: number; draft: number };
    posts: { total: number; published: number; draft: number };
    submissionsLast30Days: number;
    recentSubmissions: { id: number; name: string; email: string; createdAt: Date }[];
    email: { delivered: number; failed: number; pending: number };
    tags: { tech: number; topic: number };
  };
  export async function getDashboardStats(): Promise<DashboardStats>;
  ```
- Ships without its own test (repo convention); consumed by Task 4's mocked page test.

- [ ] **Step 1: Write the module**

Create `src/db/admin-dashboard.ts`:
```ts
import { and, count, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./index";
import { contactSubmissions, posts, projects, tags } from "./schema";

export type DashboardStats = {
  projects: { total: number; published: number; draft: number };
  posts: { total: number; published: number; draft: number };
  submissionsLast30Days: number;
  recentSubmissions: { id: number; name: string; email: string; createdAt: Date }[];
  email: { delivered: number; failed: number; pending: number };
  tags: { tech: number; topic: number };
};

// A content row is "published" when status = 'published'; everything else
// (currently only 'draft') counts as draft.
function splitByStatus(rows: { status: string; n: number }[]) {
  let total = 0;
  let published = 0;
  for (const r of rows) {
    total += r.n;
    if (r.status === "published") published += r.n;
  }
  return { total, published, draft: total - published };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    projectStatus,
    postStatus,
    recent,
    recentCount,
    delivered,
    failed,
    pending,
    tagKinds,
  ] = await Promise.all([
    db.select({ status: projects.status, n: count() }).from(projects).groupBy(projects.status),
    db.select({ status: posts.status, n: count() }).from(posts).groupBy(posts.status),
    db
      .select({
        id: contactSubmissions.id,
        name: contactSubmissions.name,
        email: contactSubmissions.email,
        createdAt: contactSubmissions.createdAt,
      })
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt), desc(contactSubmissions.id))
      .limit(5),
    db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(gte(contactSubmissions.createdAt, since)),
    db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(and(isNotNull(contactSubmissions.emailedAt), isNull(contactSubmissions.emailError))),
    db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(isNotNull(contactSubmissions.emailError)),
    db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(and(isNull(contactSubmissions.emailedAt), isNull(contactSubmissions.emailError))),
    db.select({ kind: tags.kind, n: count() }).from(tags).groupBy(tags.kind),
  ]);

  const tagByKind = new Map(tagKinds.map((t) => [t.kind, t.n]));

  return {
    projects: splitByStatus(projectStatus),
    posts: splitByStatus(postStatus),
    submissionsLast30Days: recentCount[0]?.n ?? 0,
    recentSubmissions: recent,
    email: {
      delivered: delivered[0]?.n ?? 0,
      failed: failed[0]?.n ?? 0,
      pending: pending[0]?.n ?? 0,
    },
    tags: { tech: tagByKind.get("tech") ?? 0, topic: tagByKind.get("topic") ?? 0 },
  };
}
```

- [ ] **Step 2: Type-check the module**

Run: `npx tsc --noEmit 2>&1 | grep admin-dashboard || echo "clean"`
Expected: `clean` (no tsc error references the file). Also `npm run lint` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/admin-dashboard.ts
git commit -m "Add admin dashboard aggregate queries

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Dashboard page + stat cards

**Files:**
- Modify: `src/app/admin/page.tsx` (replaces the Phase-1 stub)
- Create: `src/app/admin/page.module.css`
- Test: `src/app/admin/page.test.tsx`

**Interfaces:**
- Consumes: `getDashboardStats` + `DashboardStats` (Task 3).
- Produces: the default-export async server component `AdminDashboard`.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/page.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardStats } from "@/db/admin-dashboard";

const mocks = vi.hoisted(() => ({ getDashboardStats: vi.fn() }));
vi.mock("@/db/admin-dashboard", () => ({ getDashboardStats: mocks.getDashboardStats }));

import AdminDashboard from "./page";

const stats: DashboardStats = {
  projects: { total: 15, published: 13, draft: 2 },
  posts: { total: 3, published: 3, draft: 0 },
  submissionsLast30Days: 4,
  recentSubmissions: [
    { id: 2, name: "Ada Lovelace", email: "ada@example.com", createdAt: new Date("2026-10-20T12:00:00Z") },
  ],
  email: { delivered: 5, failed: 0, pending: 1 },
  tags: { tech: 20, topic: 6 },
};

describe("AdminDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the four stat cards with their numbers", async () => {
    mocks.getDashboardStats.mockResolvedValue(stats);
    render(await AdminDashboard());

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();          // projects total
    expect(screen.getByText(/2 drafts?/i)).toBeInTheDocument();  // draft count

    expect(screen.getByText(/Recent submissions/i)).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    expect(screen.getByText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText("Tag distribution")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();          // tech tags
  });

  it("flags email delivery failures with an alert cue", async () => {
    mocks.getDashboardStats.mockResolvedValue({ ...stats, email: { delivered: 5, failed: 3, pending: 0 } });
    render(await AdminDashboard());
    const alert = screen.getByRole("status", { name: /email delivery/i });
    expect(alert).toHaveTextContent("3");
  });

  it("does not render an alert when there are no failures", async () => {
    mocks.getDashboardStats.mockResolvedValue(stats); // failed: 0
    render(await AdminDashboard());
    expect(screen.queryByRole("status", { name: /email delivery/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/admin/page.test.tsx`
Expected: FAIL — the stub page renders none of this.

- [ ] **Step 3: Write the dashboard page**

Replace `src/app/admin/page.tsx`:
```tsx
import { getDashboardStats } from "@/db/admin-dashboard";
import styles from "./page.module.css";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className={styles.heading}>Dashboard</h1>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Content</h2>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.projects.total}</span> projects
            {stats.projects.draft > 0 && (
              <span className={styles.sub}>
                {stats.projects.draft} draft{stats.projects.draft === 1 ? "" : "s"}
              </span>
            )}
          </p>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.posts.total}</span> posts
            {stats.posts.draft > 0 && (
              <span className={styles.sub}>
                {stats.posts.draft} draft{stats.posts.draft === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Recent submissions</h2>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.submissionsLast30Days}</span> in the last 30 days
          </p>
          <ul className={styles.list}>
            {stats.recentSubmissions.map((s) => (
              <li key={s.id} className={styles.listItem}>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.meta}>
                  {s.email} · {dateFmt.format(s.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Email delivery</h2>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.email.delivered}</span> delivered
          </p>
          {stats.email.failed > 0 ? (
            <p className={styles.alert} role="status" aria-label="Email delivery failures">
              {stats.email.failed} failed
            </p>
          ) : (
            <p className={styles.sub}>No failures</p>
          )}
          {stats.email.pending > 0 && (
            <p className={styles.sub}>{stats.email.pending} pending</p>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Tag distribution</h2>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.tags.tech}</span> tech
          </p>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.tags.topic}</span> topic
          </p>
        </section>
      </div>
    </div>
  );
}
```

Create `src/app/admin/page.module.css`:
```css
.heading {
  margin: 0 0 1.5rem;
  font-family: var(--font-display, inherit);
  font-size: 1.75rem;
  color: #f5f7fa;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}
.card {
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(0, 240, 255, 0.15);
  border-radius: 0.75rem;
  background: #12161f;
}
.cardTitle {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #00f0ff;
}
.stat {
  margin: 0 0 0.5rem;
  color: #f5f7fa;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.big {
  font-family: var(--font-display, inherit);
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}
.sub {
  font-size: 0.85rem;
  color: #aab2c0;
}
.alert {
  margin: 0 0 0.5rem;
  font-weight: 600;
  color: #ff2e97;
}
.list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.listItem {
  display: flex;
  flex-direction: column;
}
.name {
  color: #f5f7fa;
  font-size: 0.9rem;
}
.meta {
  color: #aab2c0;
  font-size: 0.8rem;
}
```

- [ ] **Step 4: Run the test + full suite**

Run: `npx vitest run src/app/admin/page.test.tsx`
Expected: PASS (3 tests).
Run: `npx vitest run 2>&1 | tail -4`
Expected: total failures still ≤ 5.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/page.module.css src/app/admin/page.test.tsx
git commit -m "Add admin dashboard page with four stat cards

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `Cache-Control: no-store` on authed admin responses

**Files:**
- Modify: `src/middleware.ts`
- Test: `src/middleware.test.ts` (extend)

**Interfaces:**
- Consumes: existing `verifySession`, `SESSION_COOKIE`.
- Produces: no new exports; the authed pass-through response now carries `Cache-Control: no-store`.

- [ ] **Step 1: Write the failing test**

Add to `src/middleware.test.ts`, inside the existing `describe`:
```ts
  it("sets Cache-Control: no-store on an authenticated admin page response", async () => {
    const token = await signSession();
    const res = await middleware(request("/admin", token));
    expect(res.status).toBe(200); // NextResponse.next()
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("sets Cache-Control: no-store on an authenticated admin API response", async () => {
    const token = await signSession();
    const res = await middleware(request("/api/admin/projects", token));
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("does not set no-store on the public login page pass-through", async () => {
    const res = await middleware(request("/admin/login"));
    expect(res.headers.get("cache-control")).toBeNull();
  });
```
(The existing `request(path, token?)` helper and `signSession` import are already in this file from Phase 1.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/middleware.test.ts`
Expected: FAIL — the two authed cases expect `no-store`, current middleware sets no header.

- [ ] **Step 3: Update the middleware**

In `src/middleware.ts`, replace the authed pass-through line
```ts
  if (await verifySession(token)) return NextResponse.next();
```
with:
```ts
  if (await verifySession(token)) {
    // Authenticated admin responses must never be cached by the browser or a
    // shared proxy — they carry per-admin, always-live data.
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
```
Leave the `PUBLIC_PATHS` early return, the 401, and the redirect untouched (the login pass-through stays header-free, per spec).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/middleware.test.ts`
Expected: PASS — the new three plus all pre-existing Phase-1 middleware tests (valid cookie still → 200 and now also carries the header; login still passes through; unauth page still 307; unauth API still 401).

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts
git commit -m "Set Cache-Control: no-store on authenticated admin responses

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Full-suite + build verification

**Files:** none (verification only).

- [ ] **Step 1: Full suite**

Run: `npx vitest run 2>&1 | tail -6`
Expected: new AdminNav/dashboard/middleware tests pass; total failures ≤ the Task-0 baseline (5).

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint && (npx tsc --noEmit 2>&1 | grep -E "admin-dashboard|AdminNav|app/admin/page|middleware\.ts" || echo "no new type errors in touched files")`
Expected: lint clean (1 pre-existing unrelated warning OK); no tsc error references the files this phase touched.

- [ ] **Step 3: Production build**

Run (NOT while `next dev` runs): `npm run db:up && npm run build:verify 2>&1 | tail -30`
Expected: build succeeds; `/` and the other public URLs are unchanged (no `(site)` prefix); `/admin` builds; middleware compiles.

- [ ] **Step 4: Manual smoke (recommended)**

With dev admin env set, `npm run dev`, log in, confirm: `/admin` shows the four cards and the nav with no public Header/Footer; the public pages (`/`, `/about`, `/blog`) still render with Header/Footer. In devtools, an authed `/admin` response carries `Cache-Control: no-store`.

---

## Self-Review

**Spec coverage (3a design):**
- Public route group; moves enumerated; shrunk root layout keeps fonts/toasts/globals; URLs unchanged; one home route → Task 1. ✅
- `@/app/ProjectsSection` self-import fix → Task 1 Step 2. ✅
- Admin shell: nav (Dashboard/Projects/Posts/Tags/Submissions) + sign-out reusing LogoutButton, noindex kept, active link → Task 2. ✅
- Dashboard server component querying Postgres directly; `admin-dashboard.ts` with the exact `DashboardStats` shape; content/recent-30d/email(non-double-counting)/tags; no own test → Tasks 3 & 4. ✅
- Email-failure alert treatment; `Intl.DateTimeFormat` UTC → Task 4. ✅
- `Cache-Control: no-store` centrally in middleware on the authed path; login/401/redirect unaffected → Task 5. ✅
- Testing: moved page tests + build; AdminNav test; mocked dashboard page test; middleware header test; `admin-dashboard.ts` no isolated test → covered. ✅
- Out of scope (forms, tags CRUD, submissions viewer, create-collision decisions, live preview) → not in any task. ✅

**Placeholder scan:** none — every code step shows full code; every command has an expected result. ✅

**Type consistency:** `DashboardStats` (Task 3) is imported and matched field-for-field by Task 4's test and page (`projects.total/draft`, `posts`, `submissionsLast30Days`, `recentSubmissions[].{id,name,email,createdAt}`, `email.{delivered,failed,pending}`, `tags.{tech,topic}`). `getDashboardStats` name consistent. `AdminNav` default export consumed by `AdminLayout` (Task 2). Middleware helpers reused unchanged (Task 5). ✅

**Note for the implementer:** Task 1 is a structural move — do it first and verify the build before the admin tasks. Tasks 2, 3, 5 are independent; Task 4 depends on Task 3. Only Task 1 touches the public site; the rest are admin/middleware-local.
