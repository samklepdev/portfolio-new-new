# Dashboard Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a search bar to the top of the `/admin` dashboard that searches across Projects, Posts, Tags, and Submissions and shows grouped, as-you-type results linking to each item's edit/detail page.

**Architecture:** A pure, framework-free search module (`search.ts`) owns the result model, matching, grouping, and per-group cap. A client `GlobalSearch` component fetches the four existing admin lists once on mount (`Promise.allSettled`), feeds them through that module as the user types, and renders a combobox + listbox dropdown. The dashboard server page renders `<GlobalSearch />` in its header. No new API route or DB query.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, CSS Modules, Vitest + @testing-library/react, existing `src/services/*` (axios-based admin clients).

## Global Constraints

- Styling is **CSS Modules only** — never Tailwind, no `@tailwind`, no `tailwind.config.ts`, no postcss/autoprefixer.
- **No new runtime dependency.** Icons are hand-written inline SVG (same convention as `AdminSidebar`/`DataTable`).
- **No new search backend** — no API route, no DB query, no new service. Reuse `ProjectService`, `PostService`, `TagService`, `SubmissionService` (each exposes `list(): Promise<RowDTO[]>`).
- Neon tokens: page bg `#0b0e14`, surface `#12161f`, muted text `#8993a3`, bright text `#f5f7fa`, turquoise accent `#00f0ff`.
- Matching is a **case-insensitive substring** over identifying fields only (titles, names, slugs, emails) — never the long-form `content`.
- Each result group caps at **5** items; over the cap, a "+N more" row links to that section's list page.
- Tests use `fireEvent` from `@testing-library/react` (project convention) — do NOT add `@testing-library/user-event`. Run with `npx vitest run <path>`.
- `localStorage`/Web-Storage and timers run under jsdom; the project's `vitest.setup.ts` already polyfills storage. Use `vi.useFakeTimers()` only where a test asserts debounce timing.
- **Never run `npm run build` while `next dev` is running** — use `npm run build:verify`, and bring the DB up first with `npm run db:up`.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Pure search module (`search.ts`)

The result model plus matching/grouping/cap logic, with zero React or network — fully unit-testable in isolation.

**Files:**
- Create: `src/app/admin/(dashboard)/search.ts`
- Test: `src/app/admin/(dashboard)/search.test.ts`

**Interfaces:**
- Consumes: DTO types from `@/services/types` (`ProjectRowDTO`, `PostRowDTO`, `TagListRowDTO`, `SubmissionRowDTO`).
- Produces:
  - `export type ResultType = "project" | "post" | "tag" | "submission"`
  - `export interface ResultItem { key: string; type: ResultType; id: number; label: string; sublabel: string; href: string }`
  - `export interface ResultGroup { type: ResultType; heading: string; items: ResultItem[]; total: number; moreHref: string }`
  - `export interface SearchData { projects: ProjectRowDTO[]; posts: PostRowDTO[]; tags: TagListRowDTO[]; submissions: SubmissionRowDTO[] }`
  - `export const PER_GROUP_CAP = 5`
  - `export function buildResultItems(data: SearchData): ResultItem[]`
  - `export function filterResults(items: ResultItem[], query: string, cap?: number): ResultGroup[]`

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/(dashboard)/search.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildResultItems,
  filterResults,
  type SearchData,
} from "./search";

const data: SearchData = {
  projects: [
    { id: 1, slug: "alpha", title: "Alpha Portal", status: "published" },
    { id: 2, slug: "beta", title: "Beta Site", status: "draft" },
  ] as SearchData["projects"],
  posts: [
    { id: 5, slug: "hello", title: "Hello World", status: "published" },
  ] as SearchData["posts"],
  tags: [
    { id: 9, name: "React", kind: "tech", iconUrl: null, projectCount: 2, postCount: 0 },
  ] as SearchData["tags"],
  submissions: [
    {
      id: 7, name: "Ada Lovelace", email: "ada@example.com", budget: null,
      website: null, message: "Hi", createdAt: "2026-02-01T00:00:00Z",
      emailedAt: null, emailError: null,
    },
  ] as SearchData["submissions"],
};

describe("buildResultItems", () => {
  it("maps each record to a typed result with the right href and labels", () => {
    const items = buildResultItems(data);
    const byType = (t: string) => items.filter((i) => i.type === t);

    expect(byType("project")).toHaveLength(2);
    expect(items.find((i) => i.id === 1 && i.type === "project")).toMatchObject({
      label: "Alpha Portal",
      sublabel: "/alpha",
      href: "/admin/projects/1/edit",
      key: "project-1",
    });
    expect(items.find((i) => i.type === "post")).toMatchObject({
      label: "Hello World",
      href: "/admin/posts/5/edit",
    });
    // Tags have no per-item page; they link to the list.
    expect(items.find((i) => i.type === "tag")).toMatchObject({
      label: "React",
      sublabel: "tech",
      href: "/admin/tags",
    });
    expect(items.find((i) => i.type === "submission")).toMatchObject({
      label: "Ada Lovelace",
      sublabel: "ada@example.com",
      href: "/admin/submissions/7",
    });
  });
});

describe("filterResults", () => {
  const items = buildResultItems(data);

  it("returns no groups for an empty or whitespace query", () => {
    expect(filterResults(items, "")).toEqual([]);
    expect(filterResults(items, "   ")).toEqual([]);
  });

  it("matches case-insensitively over label and sublabel", () => {
    const groups = filterResults(items, "alpha");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ type: "project", heading: "Projects" });
    expect(groups[0].items.map((i) => i.label)).toEqual(["Alpha Portal"]);

    // sublabel (email) is searchable
    expect(filterResults(items, "example.com")[0].type).toBe("submission");
    // slug is searchable
    expect(filterResults(items, "/beta")[0].items[0].label).toBe("Beta Site");
  });

  it("groups in a fixed order and omits empty groups", () => {
    const broad = filterResults(buildResultItems({ ...data }), "e");
    const order = broad.map((g) => g.type);
    // Only the types that actually matched, but always project→post→tag→submission.
    expect(order).toEqual([...order].sort(
      (a, b) =>
        ["project", "post", "tag", "submission"].indexOf(a) -
        ["project", "post", "tag", "submission"].indexOf(b),
    ));
  });

  it("caps each group and reports the pre-cap total for '+N more'", () => {
    const many: SearchData = {
      ...data,
      projects: Array.from({ length: 7 }, (_, i) => ({
        id: i + 1, slug: `widget-${i}`, title: `Widget ${i}`, status: "published",
      })) as SearchData["projects"],
    };
    const group = filterResults(buildResultItems(many), "widget", 5)[0];
    expect(group.items).toHaveLength(5);
    expect(group.total).toBe(7);
    expect(group.moreHref).toBe("/admin/projects");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/search.test.ts"`
Expected: FAIL — cannot resolve `./search`.

- [ ] **Step 3: Write the module**

Create `src/app/admin/(dashboard)/search.ts`:

```ts
import type {
  PostRowDTO,
  ProjectRowDTO,
  SubmissionRowDTO,
  TagListRowDTO,
} from "@/services/types";

export type ResultType = "project" | "post" | "tag" | "submission";

export interface ResultItem {
  /** Unique, stable id for React keys and aria option ids. */
  key: string;
  type: ResultType;
  id: number;
  label: string;
  sublabel: string;
  href: string;
}

export interface ResultGroup {
  type: ResultType;
  heading: string;
  items: ResultItem[];
  /** Pre-cap match count, for the "+N more" affordance. */
  total: number;
  moreHref: string;
}

export interface SearchData {
  projects: ProjectRowDTO[];
  posts: PostRowDTO[];
  tags: TagListRowDTO[];
  submissions: SubmissionRowDTO[];
}

export const PER_GROUP_CAP = 5;

// Fixed display order and per-type metadata.
const GROUP_ORDER: ResultType[] = ["project", "post", "tag", "submission"];
const GROUP_META: Record<ResultType, { heading: string; moreHref: string }> = {
  project: { heading: "Projects", moreHref: "/admin/projects" },
  post: { heading: "Posts", moreHref: "/admin/posts" },
  tag: { heading: "Tags", moreHref: "/admin/tags" },
  submission: { heading: "Submissions", moreHref: "/admin/submissions" },
};

export function buildResultItems(data: SearchData): ResultItem[] {
  const items: ResultItem[] = [];

  for (const p of data.projects) {
    items.push({
      key: `project-${p.id}`,
      type: "project",
      id: p.id,
      label: p.title,
      sublabel: `/${p.slug}`,
      href: `/admin/projects/${p.id}/edit`,
    });
  }
  for (const p of data.posts) {
    items.push({
      key: `post-${p.id}`,
      type: "post",
      id: p.id,
      label: p.title,
      sublabel: `/${p.slug}`,
      href: `/admin/posts/${p.id}/edit`,
    });
  }
  for (const t of data.tags) {
    items.push({
      key: `tag-${t.id}`,
      type: "tag",
      id: t.id,
      label: t.name,
      sublabel: t.kind,
      // Tags are edited inline on the list; there is no per-tag page.
      href: "/admin/tags",
    });
  }
  for (const s of data.submissions) {
    items.push({
      key: `submission-${s.id}`,
      type: "submission",
      id: s.id,
      label: s.name,
      sublabel: s.email,
      href: `/admin/submissions/${s.id}`,
    });
  }

  return items;
}

export function filterResults(
  items: ResultItem[],
  query: string,
  cap: number = PER_GROUP_CAP,
): ResultGroup[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];

  const matched = items.filter((item) =>
    `${item.label} ${item.sublabel}`.toLowerCase().includes(q),
  );

  const groups: ResultGroup[] = [];
  for (const type of GROUP_ORDER) {
    const ofType = matched.filter((item) => item.type === type);
    if (ofType.length === 0) continue;
    groups.push({
      type,
      heading: GROUP_META[type].heading,
      items: ofType.slice(0, cap),
      total: ofType.length,
      moreHref: GROUP_META[type].moreHref,
    });
  }

  return groups;
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run "src/app/admin/(dashboard)/search.test.ts"`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/search.ts" "src/app/admin/(dashboard)/search.test.ts"
git commit -m "$(cat <<'EOF'
Add pure search module for the admin dashboard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `GlobalSearch` component

The client component: fetch-on-mount, debounced query, combobox + listbox dropdown, keyboard nav, outside-click dismissal. Consumes the Task 1 module.

**Files:**
- Create: `src/app/admin/(dashboard)/GlobalSearch.tsx`
- Create: `src/app/admin/(dashboard)/GlobalSearch.module.css`
- Test: `src/app/admin/(dashboard)/GlobalSearch.test.tsx`

**Interfaces:**
- Consumes: `buildResultItems`, `filterResults`, `SearchData` from `./search` (Task 1); `ProjectService`/`PostService`/`TagService`/`SubmissionService` (`.list()`); `ApiError` from `@/services/ApiError`; `useRouter` from `next/navigation`; `toast` from `react-toastify`.
- Produces: `export default function GlobalSearch(): JSX.Element` — renders a `role="combobox"` input (accessible name "Search admin content") and, when open with a non-empty query, a `role="listbox"` dropdown of grouped `role="option"` results.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/(dashboard)/GlobalSearch.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listPosts: vi.fn(),
  listTags: vi.fn(),
  listSubmissions: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/services/ProjectService", () => ({ default: class { list = mocks.listProjects; } }));
vi.mock("@/services/PostService", () => ({ default: class { list = mocks.listPosts; } }));
vi.mock("@/services/TagService", () => ({ default: class { list = mocks.listTags; } }));
vi.mock("@/services/SubmissionService", () => ({ default: class { list = mocks.listSubmissions; } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import GlobalSearch from "./GlobalSearch";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listProjects.mockResolvedValue([
    { id: 1, slug: "alpha", title: "Alpha Portal", status: "published" },
  ]);
  mocks.listPosts.mockResolvedValue([
    { id: 5, slug: "hello", title: "Alpha Notes", status: "published" },
  ]);
  mocks.listTags.mockResolvedValue([
    { id: 9, name: "React", kind: "tech", iconUrl: null, projectCount: 1, postCount: 0 },
  ]);
  mocks.listSubmissions.mockResolvedValue([
    { id: 7, name: "Ada Lovelace", email: "ada@alpha.com", budget: null, website: null,
      message: "Hi", createdAt: "2026-02-01T00:00:00Z", emailedAt: null, emailError: null },
  ]);
});

describe("GlobalSearch", () => {
  it("renders a combobox search input", async () => {
    render(<GlobalSearch />);
    expect(screen.getByRole("combobox", { name: /search admin content/i })).toBeInTheDocument();
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());
  });

  it("shows grouped, matching results with correct hrefs as you type", async () => {
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());

    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "alpha" },
    });

    const listbox = await screen.findByRole("listbox");
    // Matches: Alpha Portal (project), Alpha Notes (post), ada@alpha.com (submission).
    expect(within(listbox).getByRole("option", { name: /Alpha Portal/ })).toHaveAttribute(
      "href", "/admin/projects/1/edit",
    );
    expect(within(listbox).getByRole("option", { name: /Alpha Notes/ })).toHaveAttribute(
      "href", "/admin/posts/5/edit",
    );
    expect(within(listbox).getByRole("option", { name: /Ada Lovelace/ })).toHaveAttribute(
      "href", "/admin/submissions/7",
    );
    // React tag does not match "alpha".
    expect(within(listbox).queryByRole("option", { name: /React/ })).toBeNull();
  });

  it("shows an empty state when nothing matches", async () => {
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "zzzzz" },
    });
    expect(await screen.findByText(/no matches/i)).toBeInTheDocument();
  });

  it("navigates to the highlighted result on Enter and closes on Escape", async () => {
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listProjects).toHaveBeenCalled());
    const input = screen.getByRole("combobox", { name: /search admin content/i });

    fireEvent.change(input, { target: { value: "alpha" } });
    await screen.findByRole("listbox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.push).toHaveBeenCalledWith("/admin/projects/1/edit");

    fireEvent.change(input, { target: { value: "alpha" } });
    await screen.findByRole("listbox");
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("still renders results from other services when one list fails", async () => {
    mocks.listProjects.mockRejectedValue(new Error("boom"));
    render(<GlobalSearch />);
    await waitFor(() => expect(mocks.listPosts).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("combobox", { name: /search admin content/i }), {
      target: { value: "alpha" },
    });
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByRole("option", { name: /Alpha Notes/ })).toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: /Alpha Portal/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/GlobalSearch.test.tsx"`
Expected: FAIL — cannot resolve `./GlobalSearch`.

- [ ] **Step 3: Write the component**

Create `src/app/admin/(dashboard)/GlobalSearch.tsx`:

```tsx
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ProjectService from "@/services/ProjectService";
import PostService from "@/services/PostService";
import TagService from "@/services/TagService";
import SubmissionService from "@/services/SubmissionService";
import { ApiError } from "@/services/ApiError";
import { buildResultItems, filterResults, type SearchData } from "./search";
import styles from "./GlobalSearch.module.css";

const EMPTY: SearchData = { projects: [], posts: [], tags: [], submissions: [] };

function loadError(reason: unknown, label: string): string {
  return reason instanceof ApiError ? reason.message : `Could not load ${label}`;
}

export default function GlobalSearch() {
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<SearchData>(EMPTY);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Fetch the four lists once; one failing endpoint must not blank the others.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      new ProjectService().list(),
      new PostService().list(),
      new TagService().list(),
      new SubmissionService().list(),
    ]).then(([p, o, t, s]) => {
      if (cancelled) return;
      if (p.status === "rejected") toast.error(loadError(p.reason, "projects"));
      if (o.status === "rejected") toast.error(loadError(o.reason, "posts"));
      if (t.status === "rejected") toast.error(loadError(t.reason, "tags"));
      if (s.status === "rejected") toast.error(loadError(s.reason, "submissions"));
      setData({
        projects: p.status === "fulfilled" ? p.value : [],
        posts: o.status === "fulfilled" ? o.value : [],
        tags: t.status === "fulfilled" ? t.value : [],
        submissions: s.status === "fulfilled" ? s.value : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce the query so keystroke→filter stays off the critical path.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const items = useMemo(() => buildResultItems(data), [data]);
  const groups = useMemo(() => filterResults(items, debounced), [items, debounced]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  // Reset the keyboard highlight whenever the result set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced]);

  // Dismiss on outside pointer-down while open.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const showDropdown = open && query.trim() !== "";
  const activeKey = activeIndex >= 0 ? flat[activeIndex]?.key : undefined;

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      const item = activeIndex >= 0 ? flat[activeIndex] : undefined;
      if (item) {
        event.preventDefault();
        setOpen(false);
        router.push(item.href);
      }
    }
  }

  return (
    <div className={styles.search} ref={containerRef}>
      <svg
        className={styles.icon}
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        className={styles.input}
        type="search"
        role="combobox"
        aria-label="Search admin content"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeKey ? `${listboxId}-${activeKey}` : undefined}
        autoComplete="off"
        placeholder="Search projects, posts, tags, submissions…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim() !== "") setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {showDropdown && (
        <div className={styles.dropdown}>
          {flat.length === 0 ? (
            <p className={styles.empty}>No matches for “{query.trim()}”.</p>
          ) : (
            <ul className={styles.listbox} role="listbox" id={listboxId}>
              {groups.map((group) => (
                <li key={group.type} className={styles.group}>
                  <p className={styles.groupHeading} aria-hidden="true">
                    {group.heading}
                  </p>
                  <ul className={styles.groupItems}>
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <Link
                          id={`${listboxId}-${item.key}`}
                          role="option"
                          aria-selected={item.key === activeKey}
                          className={`${styles.option} ${item.key === activeKey ? styles.active : ""}`}
                          href={item.href}
                          onMouseEnter={() => setActiveIndex(flat.findIndex((f) => f.key === item.key))}
                          onClick={() => setOpen(false)}
                        >
                          <span className={styles.optionLabel}>{item.label}</span>
                          {item.sublabel && (
                            <span className={styles.optionSub}>{item.sublabel}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {group.total > group.items.length && (
                    <Link
                      className={styles.more}
                      href={group.moreHref}
                      onClick={() => setOpen(false)}
                    >
                      +{group.total - group.items.length} more in {group.heading}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write the CSS Module**

Create `src/app/admin/(dashboard)/GlobalSearch.module.css`:

```css
.search {
  position: relative;
  width: 100%;
}

.icon {
  position: absolute;
  top: 50%;
  left: 0.85rem;
  transform: translateY(-50%);
  color: #8993a3;
  pointer-events: none;
}

.input {
  width: 100%;
  font: inherit;
  font-size: 0.9rem;
  padding: 0.7rem 0.9rem 0.7rem 2.6rem;
  border-radius: 0.75rem;
  background: #0b0e14;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f5f7fa;
}

.input::placeholder {
  color: #6b7482;
}

.input:focus {
  outline: none;
  border-color: #00f0ff;
}

.dropdown {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  max-height: 24rem;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.85rem;
  background: #12161f;
  box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.5);
}

.empty {
  margin: 0;
  padding: 1rem;
  text-align: center;
  color: #8993a3;
  font-size: 0.85rem;
}

.listbox,
.groupItems {
  list-style: none;
  margin: 0;
  padding: 0;
}

.group + .group {
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.groupHeading {
  margin: 0.3rem 0.6rem 0.2rem;
  color: #8993a3;
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.option {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.55rem 0.6rem;
  border-radius: 0.55rem;
  color: #f5f7fa;
  text-decoration: none;
}

.option.active {
  background: rgba(0, 240, 255, 0.1);
}

.optionLabel {
  font-size: 0.86rem;
}

.optionSub {
  color: #8993a3;
  font-size: 0.74rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more {
  display: inline-block;
  margin: 0.1rem 0.6rem 0.3rem;
  color: #00f0ff;
  font-size: 0.74rem;
  text-decoration: none;
}

.more:hover {
  color: #f5f7fa;
}

@media (prefers-reduced-motion: reduce) {
  .option {
    transition: none;
  }
}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `npx vitest run "src/app/admin/(dashboard)/GlobalSearch.test.tsx"`
Expected: PASS (5 tests). The outside-click/positioning is not asserted (jsdom has no layout); it is verified manually after Task 3.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(dashboard)/GlobalSearch.tsx" "src/app/admin/(dashboard)/GlobalSearch.module.css" "src/app/admin/(dashboard)/GlobalSearch.test.tsx"
git commit -m "$(cat <<'EOF'
Add GlobalSearch combobox for the admin dashboard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Wire `GlobalSearch` into the dashboard header

Render the search at the top of the dashboard header and assert its presence in the page test.

**Files:**
- Modify: `src/app/admin/(dashboard)/page.tsx`
- Modify: `src/app/admin/(dashboard)/page.module.css`
- Modify: `src/app/admin/(dashboard)/page.test.tsx`

**Interfaces:**
- Consumes: `GlobalSearch` (default export from Task 2).

- [ ] **Step 1: Add the failing page-test assertion and service mocks**

In `src/app/admin/(dashboard)/page.test.tsx`, add service + toast mocks at the top of the file (the dashboard now renders `GlobalSearch`, which constructs the four services on mount) and a new assertion.

Add these mocks alongside the existing `vi.mock("@/db/admin-dashboard", …)`:

```tsx
vi.mock("@/services/ProjectService", () => ({ default: class { list = vi.fn().mockResolvedValue([]); } }));
vi.mock("@/services/PostService", () => ({ default: class { list = vi.fn().mockResolvedValue([]); } }));
vi.mock("@/services/TagService", () => ({ default: class { list = vi.fn().mockResolvedValue([]); } }));
vi.mock("@/services/SubmissionService", () => ({ default: class { list = vi.fn().mockResolvedValue([]); } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
```

Add this assertion inside the existing "renders overview metrics…" test, after the metrics assertions:

```tsx
    expect(
      screen.getByRole("combobox", { name: /search admin content/i }),
    ).toBeInTheDocument();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/page.test.tsx"`
Expected: FAIL — no combobox with that accessible name (GlobalSearch not yet rendered).

- [ ] **Step 3: Render `GlobalSearch` in the header**

In `src/app/admin/(dashboard)/page.tsx`, add the import:

```tsx
import GlobalSearch from "./GlobalSearch";
```

Replace the header block:

```tsx
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Workspace overview</p>
          <h1 className={styles.heading}>Dashboard</h1>
          <p className={styles.intro}>
            A quick look at your content and incoming messages.
          </p>
        </div>
        <Link className={styles.siteLink} href="/">
          View website <span aria-hidden="true">↗</span>
        </Link>
      </header>
```

with:

```tsx
      <header className={styles.header}>
        <GlobalSearch />
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Workspace overview</p>
            <h1 className={styles.heading}>Dashboard</h1>
            <p className={styles.intro}>
              A quick look at your content and incoming messages.
            </p>
          </div>
          <Link className={styles.siteLink} href="/">
            View website <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
```

- [ ] **Step 4: Update the header CSS**

In `src/app/admin/(dashboard)/page.module.css`, replace the `.header` rule:

```css
.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
}
```

with:

```css
.header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.headerRow {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
}
```

Then update the `@media (max-width: 520px)` block: replace its `.header` selector with `.headerRow` so the small-screen stacking still applies:

```css
@media (max-width: 520px) {
  .headerRow {
    align-items: flex-start;
    flex-direction: column;
  }
```

(leave the rest of that media block — `.metrics`, `.metricCard`, etc. — unchanged.)

- [ ] **Step 5: Run the page test and the full admin suite**

Run: `npx vitest run src/app/admin`
Expected: PASS. The dashboard test finds the combobox; existing admin tests are unaffected.

- [ ] **Step 6: Lint and production build verification**

Run:

```bash
npm run lint
npm run db:up
npm run build:verify
```

Expected: lint clean; build succeeds and generates all static pages. (Do NOT use `npm run build` if `next dev` is running.)

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(dashboard)/page.tsx" "src/app/admin/(dashboard)/page.module.css" "src/app/admin/(dashboard)/page.test.tsx"
git commit -m "$(cat <<'EOF'
Render global search in the dashboard header

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Manual verification (after Task 3)

With the DB up (`npm run db:up`) and `npm run dev`, log in and visit `/admin`:
- A search field sits at the top of the dashboard header. Typing "e" (or any common letter) opens a dropdown with results grouped under Projects / Posts / Tags / Submissions.
- Results link correctly: a project/post → its edit page, a tag → `/admin/tags`, a submission → its detail page.
- ↓/↑ move the highlight; Enter navigates to the highlighted result; Escape closes; clicking outside closes.
- A group with more than 5 matches shows "+N more in <section>" linking to that list.
- A query that matches nothing shows "No matches for '…'.".
- With OS "reduce motion" on, there is no option transition.

## Self-Review Notes

- **Spec coverage:** result model/matching/grouping/cap (Task 1); fetch-on-mount with `Promise.allSettled`, debounce, combobox/listbox a11y, keyboard nav, outside-click/Escape dismissal, empty state, "+N more", neon styling (Task 2); dashboard header placement + page-test assertion (Task 3). Tags→`/admin/tags` is encoded in `buildResultItems` and asserted in Task 1. All covered.
- **Type consistency:** `SearchData`, `ResultItem`, `ResultGroup`, `buildResultItems`, `filterResults`, `PER_GROUP_CAP` are defined in Task 1 and consumed with the same signatures in Task 2. `GlobalSearch` default export consumed in Task 3.
- **No placeholders:** every step has concrete code/commands.
- **Matching scope:** `filterResults` searches `label + sublabel` only (titles, slugs, names, kinds, emails) — never long-form `content`, per the Global Constraints.
