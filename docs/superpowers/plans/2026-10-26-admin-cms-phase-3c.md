# Admin CMS Phase 3c: Tags & Submissions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin/tags` screen (list with inline create/edit/delete, showing per-tag usage counts) and the `/admin/submissions` screens (read-only list + detail), and restore their nav links — on top of the already-built, tested Phase 2 API/services.

**Architecture:** Client components under the authenticated `src/app/admin/(dashboard)/` route group call the typed services (`TagService`, `SubmissionService` on `BaseApiService`). The only backend change is read-time: `listTags` returns each tag with `projectCount`/`postCount` via correlated subqueries. Tags edit inline in the list; submissions are read-only with a separate detail page. `DeleteButton` gains an optional `confirmLabel` so the tag delete can name its cascade impact.

**Tech Stack:** Next.js 15 App Router (client components), React 19, TypeScript, Drizzle ORM (postgres-js), CSS Modules (neon tokens), `react-toastify`, `axios` (via `BaseApiService`), vitest + @testing-library/react.

## Global Constraints

- **Styling: CSS Modules only — never Tailwind.** No `@tailwind`, no `tailwind.config`, no postcss/autoprefixer. No new UI/styling dependency.
- **Neon tokens (from `globals.css`):** `--background: #0b0e14`, `--neon-turquoise: #00f0ff`, `--neon-pink: #ff2e97`, `--neon-green: #39ff88`. Surfaces/text used in 3a/3b: card `#12161f`, border `rgba(0, 240, 255, 0.15)`, light text `#f5f7fa`, muted text `#aab2c0`. `--neon-green` is for availability/positive status only.
- **Never run `npm run build` while `next dev` runs** — shared output dir strips site-wide CSS. Use `npm run build:verify` (writes to `.next-verify`), with `npm run db:up` first (builds hit Postgres).
- **Toasts fire from async handlers, never a render body** (a render-body toast double-fires under StrictMode).
- **No new dependencies.** `axios`, `react-toastify`, `drizzle-orm` already present.
- **Do not hand-edit `drizzle/*`** and do not change `schema.ts` — this slice adds no columns (usage counts are read at query time).
- **`use(params)` pages suspend on first render.** Their tests render inside `await act(async () => render(<Suspense>…</Suspense>))` (the pattern established in Phase 3b's edit-page tests).
- **Postgres `count(*)` returns bigint as a string over the wire** — map it with `.mapWith(Number)` so DTO counts are real numbers.
- **Test runner:** `npm test` (= `vitest run`). Single file: `npx vitest run <path>`.
- **Pass/fail gate:** new tests pass AND total suite failures stay ≤ the pre-existing baseline (~5 unrelated `Timeline`/`about` failures). Re-confirm the live baseline before counting (Task 1, Step 0).
- **Field source of truth:** tag fields are exactly `TagInput` (`name`, `kind`, `iconUrl`) from `src/services/types.ts`; `kind ∈ {tech, topic}`.

---

## File Structure

**Backend (Task 1)**
- Modify `src/db/admin-queries.ts` — `listTags` returns `TagRow & { projectCount, postCount }`.
- Modify `src/services/types.ts` — add `TagListRowDTO`.
- Modify `src/services/TagService.ts` — `list()` returns `TagListRowDTO[]`.
- Modify `src/app/api/admin/tags/route.test.ts` — GET mock carries counts.

**Shared UI (Task 2)**
- Modify `src/app/admin/(dashboard)/DeleteButton.tsx` — optional `confirmLabel`.
- Modify `src/app/admin/(dashboard)/DeleteButton.test.tsx` — a `confirmLabel` case.

**Tags (Task 3)**
- Create `src/app/admin/(dashboard)/tags/page.tsx` (+ `.test.tsx`), `src/app/admin/(dashboard)/tags/tags.module.css`.

**Submissions (Tasks 4–5)**
- Create `src/app/admin/(dashboard)/submissions/status.ts` (+ `status.test.ts`) — delivery-status helper.
- Create `src/app/admin/(dashboard)/submissions/page.tsx` (+ `.test.tsx`), `src/app/admin/(dashboard)/submissions/submissions.module.css`.
- Create `src/app/admin/(dashboard)/submissions/[id]/page.tsx` (+ `detail.test.tsx`).

**Nav (Task 6)**
- Modify `src/app/admin/AdminNav.tsx`, `src/app/admin/AdminNav.test.tsx`.

**Verification (Task 7)** — no new committed files.

---

## Task 1: Backend — tag usage counts

**Files:**
- Modify: `src/db/admin-queries.ts`, `src/services/types.ts`, `src/services/TagService.ts`
- Test: `src/app/api/admin/tags/route.test.ts`

**Interfaces:**
- Consumes: `tags`, `projectTags`, `postTags` from `@/db/schema`; `sql`, `asc` from `drizzle-orm`.
- Produces:
  - `TagListRowDTO = TagRowDTO & { projectCount: number; postCount: number }` (named export from `types.ts`).
  - `listTags(): Promise<(TagRow & { projectCount: number; postCount: number })[]>`.
  - `TagService.list(): Promise<TagListRowDTO[]>`.

- [ ] **Step 0: Capture the baseline failure count**

Run: `npm run db:up && npm test 2>&1 | tail -20`
Expected: a vitest summary like `Tests  N failed | M passed`. Record `N` (expected ~5, the `Timeline`/`about` failures) — the final gate compares against it.

- [ ] **Step 1: Add `TagListRowDTO` to `types.ts`**

In `src/services/types.ts`, directly below the existing `TagRowDTO` line, add:

```ts
// listTags enriches each tag with how many projects/posts reference it, so the
// admin can see a tag's blast radius before deleting it (deletes cascade).
export type TagListRowDTO = TagRowDTO & { projectCount: number; postCount: number };
```

- [ ] **Step 2: Rewrite `listTags` to return counts**

In `src/db/admin-queries.ts`, add `projectTags`, `postTags` to the schema import:

```ts
import { contactSubmissions, postTags, posts, projectTags, projects, tags } from "./schema";
```

Replace the existing `listTags` function with:

```ts
export type TagWithCounts = TagRow & { projectCount: number; postCount: number };

export async function listTags(): Promise<TagWithCounts[]> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      kind: tags.kind,
      iconUrl: tags.iconUrl,
      projectCount:
        sql<number>`(select count(*) from ${projectTags} where ${projectTags.tagId} = ${tags.id})`.mapWith(
          Number,
        ),
      postCount:
        sql<number>`(select count(*) from ${postTags} where ${postTags.tagId} = ${tags.id})`.mapWith(
          Number,
        ),
    })
    .from(tags)
    .orderBy(asc(tags.kind), asc(tags.name));
}
```

(Correlated subqueries avoid the row fan-out a `GROUP BY` over two join tables would cause. `.mapWith(Number)` converts Postgres's bigint-as-string count to a number.)

- [ ] **Step 3: Update `TagService.list()` return type**

In `src/services/TagService.ts`, change the import and the `list` signature:

```ts
import type { TagInput, TagListRowDTO, TagRowDTO } from "@/services/types";
// ...
  list(): Promise<TagListRowDTO[]> {
    return this.getAll<TagListRowDTO>();
  }
```

(Keep `save`/`edit` returning `TagRowDTO` unchanged.)

- [ ] **Step 4: Update the tags route GET test to carry counts**

In `src/app/api/admin/tags/route.test.ts`, update the GET case so the mocked list row includes counts (shape parity with the new `listTags`):

```ts
it("GET returns the tag list", async () => {
  mocks.listTags.mockResolvedValue([{ id: 1, name: "React", kind: "tech", iconUrl: null, projectCount: 2, postCount: 0 }]);
  const res = await GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([{ id: 1, name: "React", kind: "tech", iconUrl: null, projectCount: 2, postCount: 0 }]);
});
```

- [ ] **Step 5: Type-check and run the affected tests**

Run: `npx tsc --noEmit && npx vitest run src/app/api/admin/tags/route.test.ts src/services`
Expected: no type errors; PASS (the route GET test and the existing service tests).

- [ ] **Step 6: Verify the count SQL against a live seeded DB**

The count query cannot be unit-tested (route/service tests mock the DB). Verify it against real seeded data. First ensure a seeded DB:

```bash
npm run db:up && npm run db:migrate && npm run db:seed
```

Create a throwaway script at the **repo root** named `check-tag-counts.mts` (a `.mts` file, not `tsx -e` — top-level await under `tsx -e` emits CJS and fails; relative imports match how the project's other one-off scripts import `client` from `src/db/index.ts`):

```ts
// check-tag-counts.mts  (repo root; delete after running)
import { listTags } from "./src/db/admin-queries";
import { client } from "./src/db/index";

const rows = await listTags();
console.table(
  rows.map((r) => ({ name: r.name, kind: r.kind, projectCount: r.projectCount, postCount: r.postCount })),
);
const total = rows.reduce((n, r) => n + r.projectCount + r.postCount, 0);
if (rows.length > 0 && typeof rows[0].projectCount !== "number") throw new Error("counts are not numbers");
if (total === 0) throw new Error("expected some seeded tag links, got zero");
console.log("OK — counts are numeric and non-zero in aggregate");
await client.end();
```

Run: `npx tsx check-tag-counts.mts`
Expected: a table of tags with numeric counts, at least one non-zero, and `OK — counts are numeric and non-zero in aggregate`. Then remove it: `rm check-tag-counts.mts` (it must never be committed).

- [ ] **Step 7: Commit**

```bash
git add src/db/admin-queries.ts src/services/types.ts src/services/TagService.ts src/app/api/admin/tags/route.test.ts
git commit -m "Return per-tag project/post usage counts from listTags"
```

---

## Task 2: `DeleteButton` — optional `confirmLabel`

**Files:**
- Modify: `src/app/admin/(dashboard)/DeleteButton.tsx`
- Test: `src/app/admin/(dashboard)/DeleteButton.test.tsx`

**Interfaces:**
- Produces: `DeleteButton({ onConfirm, label, confirmLabel }: { onConfirm: () => Promise<void>; label?: string; confirmLabel?: string })` — `confirmLabel` defaults to `"Confirm?"` (current behaviour). Existing call sites (projects/posts lists) are unaffected.

- [ ] **Step 1: Add the failing test case**

Append to the `describe("DeleteButton", …)` block in `src/app/admin/(dashboard)/DeleteButton.test.tsx`:

```tsx
it("shows a custom confirm label when armed", async () => {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(<DeleteButton onConfirm={onConfirm} confirmLabel="Unlinks from 2 projects — confirm?" />);
  fireEvent.click(screen.getByRole("button", { name: /delete/i }));
  const armed = screen.getByRole("button", { name: /unlinks from 2 projects/i });
  fireEvent.click(armed);
  await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/DeleteButton.test.tsx"`
Expected: FAIL — armed button still reads "Confirm?", so the `/unlinks from 2 projects/i` query finds nothing.

- [ ] **Step 3: Add the `confirmLabel` prop**

In `src/app/admin/(dashboard)/DeleteButton.tsx`, add the prop and use it in the armed state:

```tsx
export default function DeleteButton({
  onConfirm,
  label = "Delete",
  confirmLabel = "Confirm?",
}: {
  onConfirm: () => Promise<void>;
  label?: string;
  confirmLabel?: string;
}) {
```

Change the button text expression to:

```tsx
      {pending ? "Deleting…" : armed ? confirmLabel : label}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/DeleteButton.test.tsx"`
Expected: PASS (all cases, including the existing "requires a confirm click").

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/DeleteButton.tsx" "src/app/admin/(dashboard)/DeleteButton.test.tsx"
git commit -m "Add optional confirmLabel to DeleteButton"
```

---

## Task 3: `/admin/tags` — list with inline create/edit/delete

**Files:**
- Create: `src/app/admin/(dashboard)/tags/page.tsx`, `src/app/admin/(dashboard)/tags/tags.module.css`
- Test: `src/app/admin/(dashboard)/tags/page.test.tsx`

**Interfaces:**
- Consumes: `TagService` (`list`, `save`, `edit`, inherited `delete`), `TagInput`/`TagListRowDTO`, `ApiError`, `DeleteButton` (with `confirmLabel`), `list.module.css`.
- Produces: default export client page at `/admin/tags`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/(dashboard)/tags/page.test.tsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), edit: vi.fn(), del: vi.fn() }));
vi.mock("@/services/TagService", () => ({
  default: class { list = mocks.list; save = mocks.save; edit = mocks.edit; delete = mocks.del; },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import TagsListPage from "./page";

const tags = [
  { id: 1, name: "React", kind: "tech", iconUrl: null, projectCount: 2, postCount: 0 },
  { id: 2, name: "Self-hosting", kind: "topic", iconUrl: null, projectCount: 0, postCount: 0 },
];

describe("TagsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue(tags);
  });

  it("renders a row per tag with its usage", async () => {
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    expect(screen.getByText("2 projects")).toBeInTheDocument();
  });

  it("creates a tag and refetches", async () => {
    mocks.save.mockResolvedValue({ id: 3, name: "Vue", kind: "tech", iconUrl: null });
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("New tag name"), { target: { value: "Vue" } });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Vue", kind: "tech", iconUrl: null }),
    ));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  });

  it("edits a tag through the service", async () => {
    mocks.edit.mockResolvedValue(tags[0]);
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /edit react/i }));
    fireEvent.change(screen.getByLabelText(/edit name/i), { target: { value: "Preact" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.edit).toHaveBeenCalledWith("1", expect.objectContaining({ name: "Preact" })));
  });

  it("names the cascade impact when deleting a used tag", async () => {
    mocks.del.mockResolvedValue(undefined);
    render(<TagsListPage />);
    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument());
    const delButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(delButtons[0]); // React row (2 projects)
    fireEvent.click(screen.getByRole("button", { name: /unlinks from 2 projects/i }));
    await waitFor(() => expect(mocks.del).toHaveBeenCalledWith("1"));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/tags/page.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page**

```tsx
// src/app/admin/(dashboard)/tags/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import TagService from "@/services/TagService";
import type { TagInput, TagListRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DeleteButton from "../DeleteButton";
import listStyles from "../list.module.css";
import styles from "./tags.module.css";

const KIND_OPTIONS = ["tech", "topic"];
const emptyTag = (): TagInput => ({ name: "", kind: "tech", iconUrl: null });
const clean = (t: TagInput): TagInput => ({
  name: t.name.trim(),
  kind: t.kind,
  iconUrl: t.iconUrl && t.iconUrl.trim() !== "" ? t.iconUrl.trim() : null,
});

function usageLabel(row: TagListRowDTO): string {
  const parts: string[] = [];
  if (row.projectCount > 0) parts.push(`${row.projectCount} project${row.projectCount === 1 ? "" : "s"}`);
  if (row.postCount > 0) parts.push(`${row.postCount} post${row.postCount === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "—";
}

export default function TagsListPage() {
  const service = useMemo(() => new TagService(), []);
  const [rows, setRows] = useState<TagListRowDTO[] | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TagInput>(emptyTag());
  const [newTag, setNewTag] = useState<TagInput>(emptyTag());

  const load = useCallback(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load tags"));
  }, [service]);

  useEffect(() => load(), [load]);

  async function create() {
    if (newTag.name.trim() === "") return;
    try {
      await service.save(clean(newTag));
      toast.success("Tag created");
      setNewTag(emptyTag());
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Create failed");
    }
  }

  function startEdit(row: TagListRowDTO) {
    setEditingId(row.id);
    setDraft({ name: row.name, kind: row.kind, iconUrl: row.iconUrl });
  }

  async function saveEdit(id: number) {
    try {
      await service.edit(String(id), clean(draft));
      toast.success("Tag saved");
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  async function remove(row: TagListRowDTO) {
    try {
      await service.delete(String(row.id));
      toast.success(`Deleted “${row.name}”`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  const confirmLabel = (row: TagListRowDTO) =>
    row.projectCount + row.postCount > 0 ? `Unlinks from ${usageLabel(row)} — confirm?` : "Confirm?";

  return (
    <div>
      <div className={listStyles.header}>
        <h1 className={listStyles.heading}>Tags</h1>
      </div>

      <div className={styles.newRow}>
        <input aria-label="New tag name" placeholder="New tag name" value={newTag.name}
          onChange={(e) => setNewTag((t) => ({ ...t, name: e.target.value }))} />
        <select aria-label="New tag kind" value={newTag.kind}
          onChange={(e) => setNewTag((t) => ({ ...t, kind: e.target.value }))}>
          {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input aria-label="New tag icon URL" placeholder="Icon URL (optional)" value={newTag.iconUrl ?? ""}
          onChange={(e) => setNewTag((t) => ({ ...t, iconUrl: e.target.value }))} />
        <button type="button" className={styles.add} onClick={create}>Add tag</button>
      </div>

      {rows === null ? (
        <p className={listStyles.muted}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className={listStyles.muted}>No tags yet.</p>
      ) : (
        <table className={listStyles.table}>
          <thead>
            <tr><th>Name</th><th>Kind</th><th>Used by</th><th>Icon</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              editingId === row.id ? (
                <tr key={row.id}>
                  <td>
                    <input aria-label={`Edit name ${row.name}`} value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  </td>
                  <td>
                    <select aria-label={`Edit kind ${row.name}`} value={draft.kind}
                      onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}>
                      {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>
                  <td>{usageLabel(row)}</td>
                  <td>
                    <input aria-label={`Edit icon ${row.name}`} value={draft.iconUrl ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, iconUrl: e.target.value }))} />
                  </td>
                  <td className={listStyles.rowActions}>
                    <button type="button" className={styles.add} onClick={() => saveEdit(row.id)}>Save</button>
                    <button type="button" className={styles.cancel} onClick={() => setEditingId(null)}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.kind}</td>
                  <td>{usageLabel(row)}</td>
                  <td>{row.iconUrl ?? "—"}</td>
                  <td className={listStyles.rowActions}>
                    <button type="button" className={styles.edit} aria-label={`Edit ${row.name}`}
                      onClick={() => startEdit(row)}>Edit</button>
                    <DeleteButton onConfirm={() => remove(row)} confirmLabel={confirmLabel(row)} />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

```css
/* src/app/admin/(dashboard)/tags/tags.module.css */
.newRow {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.newRow input,
.newRow select,
table input,
table select {
  font: inherit;
  padding: 0.4rem 0.55rem;
  border-radius: 0.4rem;
  background: #0b0e14;
  border: 1px solid rgba(0, 240, 255, 0.2);
  color: #f5f7fa;
}
.newRow input:focus,
table input:focus {
  outline: none;
  border-color: #00f0ff;
}
.add,
.cancel,
.edit {
  font: inherit;
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  border-radius: 0.4rem;
  cursor: pointer;
  background: transparent;
}
.add {
  border: 1px solid #00f0ff;
  color: #00f0ff;
}
.edit {
  border: 1px solid rgba(0, 240, 255, 0.3);
  color: #00f0ff;
}
.cancel {
  border: 1px solid rgba(170, 178, 192, 0.4);
  color: #aab2c0;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/tags/page.test.tsx"`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/tags"
git commit -m "Add admin tags page with inline create/edit and usage-aware delete"
```

---

## Task 4: `/admin/submissions` — read-only list + status helper

**Files:**
- Create: `src/app/admin/(dashboard)/submissions/status.ts`, `src/app/admin/(dashboard)/submissions/page.tsx`, `src/app/admin/(dashboard)/submissions/submissions.module.css`
- Test: `src/app/admin/(dashboard)/submissions/status.test.ts`, `src/app/admin/(dashboard)/submissions/page.test.tsx`

**Interfaces:**
- Consumes: `SubmissionService` (`list`), `SubmissionRowDTO`, `ApiError`, `list.module.css`.
- Produces:
  - `deliveryStatus(s: Pick<SubmissionRowDTO, "emailedAt" | "emailError">): "delivered" | "failed" | "pending"` and `type DeliveryStatus` (named exports from `status.ts`).
  - default export client page at `/admin/submissions`.

- [ ] **Step 1: Write the failing status test**

```ts
// src/app/admin/(dashboard)/submissions/status.test.ts
import { describe, expect, it } from "vitest";
import { deliveryStatus } from "./status";

describe("deliveryStatus", () => {
  it("is failed when there is an email error", () => {
    expect(deliveryStatus({ emailedAt: "2026-02-01T00:00:00Z", emailError: "550 rejected" })).toBe("failed");
  });
  it("is delivered when emailed and no error", () => {
    expect(deliveryStatus({ emailedAt: "2026-02-01T00:00:00Z", emailError: null })).toBe("delivered");
  });
  it("is pending when neither", () => {
    expect(deliveryStatus({ emailedAt: null, emailError: null })).toBe("pending");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/submissions/status.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the status helper**

```ts
// src/app/admin/(dashboard)/submissions/status.ts
import type { SubmissionRowDTO } from "@/services/types";

export type DeliveryStatus = "delivered" | "failed" | "pending";

// Error wins over a delivery timestamp: a row that recorded an error is "failed"
// even if an earlier attempt stamped emailedAt. Mirrors the dashboard's logic.
export function deliveryStatus(
  s: Pick<SubmissionRowDTO, "emailedAt" | "emailError">,
): DeliveryStatus {
  if (s.emailError) return "failed";
  if (s.emailedAt) return "delivered";
  return "pending";
}
```

- [ ] **Step 4: Run to verify the status test passes**

Run: `npx vitest run "src/app/admin/(dashboard)/submissions/status.test.ts"`
Expected: PASS.

- [ ] **Step 5: Write the failing list-page test**

```tsx
// src/app/admin/(dashboard)/submissions/page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/services/SubmissionService", () => ({ default: class { list = mocks.list; } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SubmissionsListPage from "./page";

describe("SubmissionsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([
      { id: 5, name: "Jane Doe", email: "jane@co.com", budget: null, website: null, message: "Hi",
        createdAt: "2026-02-01T00:00:00Z", emailedAt: "2026-02-01T00:05:00Z", emailError: null },
      { id: 6, name: "John Roe", email: "john@x.com", budget: null, website: null, message: "Hey",
        createdAt: "2026-01-08T00:00:00Z", emailedAt: null, emailError: "550 rejected" },
    ]);
  });

  it("renders a row per submission with a delivery badge and a view link", async () => {
    render(<SubmissionsListPage />);
    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());
    expect(screen.getByText("delivered")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view jane doe/i })).toHaveAttribute("href", "/admin/submissions/5");
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/submissions/page.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement the list page + styles**

```tsx
// src/app/admin/(dashboard)/submissions/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import SubmissionService from "@/services/SubmissionService";
import type { SubmissionRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import { deliveryStatus } from "./status";
import listStyles from "../list.module.css";
import styles from "./submissions.module.css";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function SubmissionsListPage() {
  const service = useMemo(() => new SubmissionService(), []);
  const [rows, setRows] = useState<SubmissionRowDTO[] | null>(null);

  useEffect(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load submissions"));
  }, [service]);

  return (
    <div>
      <div className={listStyles.header}>
        <h1 className={listStyles.heading}>Submissions</h1>
      </div>
      {rows === null ? (
        <p className={listStyles.muted}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className={listStyles.muted}>No submissions yet.</p>
      ) : (
        <table className={listStyles.table}>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Received</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const status = deliveryStatus(s);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{dateFmt.format(new Date(s.createdAt))}</td>
                  <td><span className={`${styles.badge} ${styles[status]}`}>{status}</span></td>
                  <td className={listStyles.rowActions}>
                    <Link className={listStyles.editLink} href={`/admin/submissions/${s.id}`}
                      aria-label={`View ${s.name}`}>View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

```css
/* src/app/admin/(dashboard)/submissions/submissions.module.css */
.badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid currentColor;
}
.delivered { color: #39ff88; }
.failed { color: #ff2e97; }
.pending { color: #aab2c0; }

.detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 44rem;
}
.email {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}
.email a { color: #00f0ff; }
.meta {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.4rem 1rem;
  margin: 0;
  color: #f5f7fa;
}
.meta dt { color: #aab2c0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
.meta dd { margin: 0; }
.error { color: #ff2e97; }
.message {
  white-space: pre-wrap;
  line-height: 1.6;
  padding: 1rem 1.25rem;
  border: 1px solid rgba(0, 240, 255, 0.15);
  border-radius: 0.75rem;
  background: #12161f;
  color: #f5f7fa;
}
```

(The `badge` uses `--neon-green` for `delivered` — a genuine positive delivery status, which the token rules permit.)

- [ ] **Step 8: Run to verify the list-page test passes**

Run: `npx vitest run "src/app/admin/(dashboard)/submissions/page.test.tsx"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(dashboard)/submissions/status.ts" "src/app/admin/(dashboard)/submissions/status.test.ts" "src/app/admin/(dashboard)/submissions/page.tsx" "src/app/admin/(dashboard)/submissions/page.test.tsx" "src/app/admin/(dashboard)/submissions/submissions.module.css"
git commit -m "Add admin submissions list with delivery-status badges"
```

---

## Task 5: `/admin/submissions/[id]` — read-only detail

**Files:**
- Create: `src/app/admin/(dashboard)/submissions/[id]/page.tsx`
- Test: `src/app/admin/(dashboard)/submissions/[id]/detail.test.tsx`

**Interfaces:**
- Consumes: `SubmissionService` (`get`), `SubmissionRowDTO`, `ApiError`, `deliveryStatus` from `../status`, `submissions.module.css`, `list.module.css`.
- Produces: default export client page at `/admin/submissions/[id]`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/(dashboard)/submissions/[id]/detail.test.tsx
import { render, screen, waitFor, act } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/SubmissionService", () => ({ default: class { get = mocks.get; } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SubmissionDetailPage from "./page";

const dto = {
  id: 5, name: "Jane Doe", email: "jane@co.com", budget: "$10k–20k", website: "co.com",
  message: "Hi, I'd love to talk.", createdAt: "2026-02-01T00:00:00Z",
  emailedAt: "2026-02-01T00:05:00Z", emailError: null,
};

// Detail unwraps `params` with use(); render inside an awaited act under Suspense.
async function renderPage() {
  await act(async () => {
    render(
      <Suspense>
        <SubmissionDetailPage params={Promise.resolve({ id: "5" })} />
      </Suspense>,
    );
  });
}

describe("SubmissionDetailPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the submission with a mailto reply link and the message", async () => {
    mocks.get.mockResolvedValue(dto);
    await renderPage();
    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "jane@co.com" })).toHaveAttribute("href", "mailto:jane@co.com");
    expect(screen.getByText("Hi, I'd love to talk.")).toBeInTheDocument();
    expect(screen.getByText("$10k–20k")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/submissions/[id]/detail.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the detail page**

```tsx
// src/app/admin/(dashboard)/submissions/[id]/page.tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import SubmissionService from "@/services/SubmissionService";
import type { SubmissionRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import { deliveryStatus } from "../status";
import listStyles from "../../list.module.css";
import styles from "../submissions.module.css";

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  dateStyle: "medium",
  timeStyle: "short",
});

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = useMemo(() => new SubmissionService(), []);
  const [row, setRow] = useState<SubmissionRowDTO | null>(null);

  useEffect(() => {
    service
      .get(id)
      .then(setRow)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load submission"));
  }, [service, id]);

  if (!row) return <p className={listStyles.muted}>Loading…</p>;

  const status = deliveryStatus(row);
  return (
    <div className={styles.detail}>
      <Link className={listStyles.editLink} href="/admin/submissions">← All submissions</Link>
      <h1 className={listStyles.heading}>{row.name}</h1>
      <p className={styles.email}>
        <a href={`mailto:${row.email}`}>{row.email}</a>
        <span className={`${styles.badge} ${styles[status]}`}>{status}</span>
      </p>
      <dl className={styles.meta}>
        {row.budget && (<><dt>Budget</dt><dd>{row.budget}</dd></>)}
        {row.website && (<><dt>Website</dt><dd>{row.website}</dd></>)}
        <dt>Received</dt>
        <dd>{dateTimeFmt.format(new Date(row.createdAt))}</dd>
        {row.emailedAt && (<><dt>Delivered</dt><dd>{dateTimeFmt.format(new Date(row.emailedAt))}</dd></>)}
        {row.emailError && (<><dt>Email error</dt><dd className={styles.error}>{row.emailError}</dd></>)}
      </dl>
      <div className={styles.message}>{row.message}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/submissions/[id]/detail.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/submissions/[id]"
git commit -m "Add admin submission detail page with mailto reply"
```

---

## Task 6: Restore the Tags & Submissions nav links

**Files:**
- Modify: `src/app/admin/AdminNav.tsx`, `src/app/admin/AdminNav.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AdminNav` renders five links (Dashboard, Projects, Posts, Tags, Submissions).

- [ ] **Step 1: Update the nav test (failing)**

In `src/app/admin/AdminNav.test.tsx`, restore the five-link assertion and delete the "omits links to pages that do not exist yet" test:

```tsx
  it("renders all five admin links and a sign-out control", () => {
    mocks.usePathname.mockReturnValue("/admin");
    render(<AdminNav />);
    for (const label of ["Dashboard", "Projects", "Posts", "Tags", "Submissions"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/admin/AdminNav.test.tsx`
Expected: FAIL — `Tags`/`Submissions` links are not rendered.

- [ ] **Step 3: Restore the links**

In `src/app/admin/AdminNav.tsx`, replace the `LINKS` array (and drop the now-stale comment) with:

```tsx
const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/submissions", label: "Submissions" },
] as const;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/admin/AdminNav.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/AdminNav.tsx src/app/admin/AdminNav.test.tsx
git commit -m "Restore Tags and Submissions nav links now that the pages exist"
```

---

## Task 7: Full verification

**Files:** none committed.

- [ ] **Step 1: Run the full test suite**

Run: `npm run db:up && npm test 2>&1 | tail -25`
Expected: all new admin tests pass; total failures ≤ the baseline recorded in Task 1 Step 0 (~5 `Timeline`/`about`). Fix any admin-test failure before proceeding.

- [ ] **Step 2: Type-check + lint via a production build into the verify dir**

Run: `npm run build:verify 2>&1 | tail -30`
Expected: build succeeds; `/admin/tags`, `/admin/submissions`, and `/admin/submissions/[id]` appear in the route list. Must NOT be `npm run build` while `next dev` is running.

- [ ] **Step 3: Smoke-test the routes against the verify build**

Run `npm run start:verify -- -p 3100` in one shell, then in another:

```bash
for p in /admin/tags /admin/submissions /admin/submissions/1; do echo -n "$p "; curl -s -o /dev/null -w '%{http_code}\n' localhost:3100$p; done
```

Expected: each returns `307` (redirect to `/admin/login`, unauthenticated) — confirming the routes resolve and the middleware gate covers them. A `404` means a page file is misplaced. Stop the server afterward.

- [ ] **Step 4: Final commit if anything changed during verification**

Stage only admin/editor/db/service paths with explicit pathspecs — **never `git add -A`** (the untracked `src/content/posts/pi-hosted-*.md` files and `.github/` must never be staged). Normally nothing changes here.

```bash
git add "src/app/admin" src/db src/services src/app/api/admin
git commit -m "Phase 3c: verify admin tags/submissions build" || echo "nothing to commit"
```

---

## Self-Review Notes (addressed)

- **Spec coverage:** tag usage counts → Task 1; `DeleteButton` `confirmLabel` → Task 2; `/admin/tags` inline list/create/edit + usage-aware delete → Task 3; delivery-status helper + submissions list with badges → Task 4; read-only detail with `mailto:` → Task 5; nav links restored → Task 6; verification with `build:verify` + `db:up` + route smoke test → Task 7. The count SQL (only DB-dependent logic, un-unit-testable because route/service tests mock the DB) is verified live in Task 1 Step 6.
- **Out-of-scope honored:** no tag merge/rename tooling, no submission delete/export, no pagination, no schema/`drizzle` change, no new deps, no `kind`-as-identity filtering.
- **Type consistency:** `TagListRowDTO` defined in Task 1 is consumed in Task 3; `TagService.list(): Promise<TagListRowDTO[]>`; `service.delete(String(id))` / `service.edit(String(id), …)` match `BaseApiService`; `deliveryStatus` signature defined in Task 4 is reused in Tasks 4 & 5; `DeleteButton`'s new `confirmLabel` (Task 2) is passed in Task 3.
```
