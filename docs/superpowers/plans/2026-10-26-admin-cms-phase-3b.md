# Admin CMS Phase 3b: Projects & Posts List + Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin/projects` and `/admin/posts` screens — a list (edit/delete) and a create/edit form for each — on top of the already-built, tested Phase 2 API/services, plus a slug-collision 409 contract on create.

**Architecture:** Client components under the authenticated `src/app/admin/(dashboard)/` route group call the typed Phase 2 services (`ProjectService`, `PostService` on `BaseApiService`). A pure, prop-driven `ProjectForm`/`PostForm` renders all fields and emits a typed input via an injected `onSubmit`; thin `new/` and `[id]/edit/` wrapper pages own the service call, success toast, and navigation. One small server change makes create reject an existing slug with `409` instead of silently overwriting.

**Tech Stack:** Next.js 15 App Router (client components), React 19, TypeScript, Drizzle ORM (postgres-js), CSS Modules (neon tokens), `react-toastify`, `axios` (via `BaseApiService`), vitest + @testing-library/react.

## Global Constraints

- **Styling: CSS Modules only — never Tailwind.** No `@tailwind`, no `tailwind.config`, no postcss/autoprefixer. No new UI/styling dependency.
- **Neon tokens (from `globals.css`):** `--background: #0b0e14`, `--foreground: #ffffff`, `--neon-turquoise: #00f0ff`, `--neon-pink: #ff2e97`, `--neon-purple: #b026ff`, `--neon-green: #39ff88`. Surfaces/text used in 3a: card `#12161f`, border `rgba(0, 240, 255, 0.15)`, light text `#f5f7fa`, muted text `#aab2c0`. Status/green is for availability only — do not use `--neon-green` here.
- **Never run `npm run build` while `next dev` runs** — shared output dir strips site-wide CSS. Use `npm run build:verify` (writes to `.next-verify`), with `npm run db:up` first (builds hit `generateStaticParams` → Postgres).
- **Toasts fire from an effect/async handler, never from a render body** (a render-body toast double-fires under StrictMode). Success toast + navigation happen only after a resolved service call.
- **No new dependencies.** `jose`, `axios`, `react-toastify` already present.
- **Do not hand-edit `drizzle/*`** and do not change `schema.ts` — this slice adds no columns.
- **Test runner:** `npm test` (= `vitest run`). Single file: `npx vitest run <path>`.
- **Pass/fail gate:** new tests pass AND total suite failures stay ≤ the pre-existing baseline. The 3a baseline was 5 unrelated failures (`Timeline`/`about`). Re-confirm the live baseline before counting (Task 1, Step 0).
- **Field source of truth:** form fields are exactly `ProjectInput` / `PostInput` from `src/services/types.ts`. Do not add or drop fields.

---

## File Structure

**Backend (Task 1)**
- Modify `src/db/content-write.ts` — add `SlugConflictError`; add an `onSlugConflict: "overwrite" | "reject"` option (default `"overwrite"`) to `upsertProjectWithTags` and `upsertPostWithTags`. Importer keeps the default, so it is untouched.
- Modify `src/app/api/admin/projects/route.ts` and `src/app/api/admin/posts/route.ts` — POST passes `{ onSlugConflict: "reject" }` and maps `SlugConflictError` → `409`.
- Modify `src/app/api/admin/projects/route.test.ts`, `src/app/api/admin/posts/route.test.ts` — add the 409 case.

**Shared UI (Tasks 2–3), colocated under the route group (non-`page` files are not routes)**
- `src/app/admin/(dashboard)/DeleteButton.tsx` (+ `.module.css`, `.test.tsx`) — confirm-then-delete control.
- `src/app/admin/(dashboard)/FormFields.tsx` (+ `.module.css`, `.test.tsx`) — labelled input/textarea/checkbox/select/number/date primitives.
- `src/app/admin/(dashboard)/editor.module.css` — shared form layout (created in Task 3, used by Tasks 5 & 7).
- `src/app/admin/(dashboard)/list.module.css` — shared list-table styling (created in Task 4, reused in Task 6).

**Projects (Tasks 4–5)**
- `src/app/admin/(dashboard)/projects/page.tsx` (+ `.test.tsx`) — list.
- `src/app/admin/(dashboard)/ProjectForm.tsx` (+ `.test.tsx`) — pure form.
- `src/app/admin/(dashboard)/projects/new/page.tsx` — create wrapper.
- `src/app/admin/(dashboard)/projects/[id]/edit/page.tsx` (+ `edit.test.tsx`) — edit wrapper.

**Posts (Tasks 6–7)**
- `src/app/admin/(dashboard)/posts/page.tsx` (+ `.test.tsx`) — list.
- `src/app/admin/(dashboard)/PostForm.tsx` (+ `.test.tsx`) — pure form.
- `src/app/admin/(dashboard)/posts/new/page.tsx` — create wrapper.
- `src/app/admin/(dashboard)/posts/[id]/edit/page.tsx` (+ `edit.test.tsx`) — edit wrapper.

**Verification (Task 8)** — no new files.

---

## Task 1: Backend — slug-collision 409 on create

**Files:**
- Modify: `src/db/content-write.ts`
- Modify: `src/app/api/admin/projects/route.ts`, `src/app/api/admin/posts/route.ts`
- Test: `src/app/api/admin/projects/route.test.ts`, `src/app/api/admin/posts/route.test.ts`

**Interfaces:**
- Consumes: existing `upsertProjectWithTags(input: ProjectWrite)`, `upsertPostWithTags(input: PostWrite)`, `requireAdmin`, `parseProjectInput`, `parsePostInput`.
- Produces:
  - `class SlugConflictError extends Error` (exported from `content-write.ts`).
  - `upsertProjectWithTags(input: ProjectWrite, opts?: { onSlugConflict?: "overwrite" | "reject" }): Promise<ProjectRow>`
  - `upsertPostWithTags(input: PostWrite, opts?: { onSlugConflict?: "overwrite" | "reject" }): Promise<PostRow>`
  - Collection `POST /api/admin/projects` and `/posts` return `409 { error }` on an existing slug.

- [ ] **Step 0: Capture the baseline failure count**

Run: `npm run db:up && npm test 2>&1 | tail -20`
Expected: a vitest summary line like `Tests  N failed | M passed`. Record `N` — this is the baseline the final gate compares against (expected ~5, the `Timeline`/`about` failures).

- [ ] **Step 1: Add the 409 case to the projects route test (failing)**

In `src/app/api/admin/projects/route.test.ts`, import `SlugConflictError` and add a case inside the `describe` block:

```ts
import { SlugConflictError } from "@/db/content-write";

it("POST returns 409 when the slug already exists", async () => {
  mocks.upsertProjectWithTags.mockRejectedValue(new SlugConflictError("slug exists"));
  const res = await POST(post({ slug: "demo", title: "Demo", summary: "s" }));
  expect(res.status).toBe(409);
  expect((await res.json()).error).toMatch(/slug/i);
});

it("POST passes onSlugConflict: reject to the write path", async () => {
  mocks.upsertProjectWithTags.mockResolvedValue({ id: 9, slug: "demo" });
  await POST(post({ slug: "demo", title: "Demo", summary: "s" }));
  expect(mocks.upsertProjectWithTags).toHaveBeenCalledWith(
    expect.objectContaining({ slug: "demo" }),
    { onSlugConflict: "reject" },
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/admin/projects/route.test.ts`
Expected: FAIL — `SlugConflictError` is not exported yet / status is 201 not 409.

- [ ] **Step 3: Add `SlugConflictError` and the `onSlugConflict` option to `content-write.ts`**

At the top of `src/db/content-write.ts`, after the existing type aliases (`ProjectWrite`/`PostWrite`), add:

```ts
export class SlugConflictError extends Error {
  constructor(message = "slug already exists") {
    super(message);
    this.name = "SlugConflictError";
  }
}

type WriteOpts = { onSlugConflict?: "overwrite" | "reject" };
```

In `upsertProjectWithTags`, change the signature and the **insert (create) branch only**:

```ts
export async function upsertProjectWithTags(
  input: ProjectWrite,
  opts: WriteOpts = {},
): Promise<ProjectRow> {
  return db.transaction(async (tx) => {
    const cols = PROJECT_COLUMNS(input);
    let row: ProjectRow;
    if (input.id !== undefined) {
      // ...unchanged update branch...
    } else if (opts.onSlugConflict === "reject") {
      const [inserted] = await tx
        .insert(projects)
        .values(cols)
        .onConflictDoNothing({ target: projects.slug })
        .returning();
      if (!inserted) throw new SlugConflictError(`A project with slug "${input.slug}" already exists`);
      row = inserted;
    } else {
      // ...unchanged onConflictDoUpdate branch (the existing create path)...
    }
    // ...unchanged tag relink + prune + return row...
  });
}
```

Keep the existing `update` branch and the existing `onConflictDoUpdate` branch exactly as they are — only split the `else` into `else if (reject)` / `else (overwrite)`. Apply the identical change to `upsertPostWithTags` (same `WriteOpts` param, same reject branch using `posts`/`posts.slug` and the message `A post with slug "${input.slug}" already exists`).

- [ ] **Step 4: Wire the projects POST route to reject + map to 409**

In `src/app/api/admin/projects/route.ts`, replace the POST body's write call:

```ts
import { SlugConflictError, upsertProjectWithTags } from "@/db/content-write";
// ...
  const parsed = parseProjectInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const row = await upsertProjectWithTags(parsed.value, { onSlugConflict: "reject" });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    if (err instanceof SlugConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
```

- [ ] **Step 5: Run the projects route test to verify it passes**

Run: `npx vitest run src/app/api/admin/projects/route.test.ts`
Expected: PASS (all cases, including the two new ones).

- [ ] **Step 6: Mirror the test + wiring for posts**

Add the same two cases to `src/app/api/admin/posts/route.test.ts` (import `SlugConflictError`, use the posts `post()` helper and a valid post body `{ slug, title, excerpt }`, expect `onSlugConflict: "reject"`). Then apply the same try/catch + `{ onSlugConflict: "reject" }` change to `src/app/api/admin/posts/route.ts`.

- [ ] **Step 7: Run both route test files**

Run: `npx vitest run src/app/api/admin/projects/route.test.ts src/app/api/admin/posts/route.test.ts`
Expected: PASS.

- [ ] **Step 8: Confirm the importer still type-checks and its idempotency test passes**

Run: `npx vitest run src/db/import-content/parse.test.ts && npx tsc --noEmit`
Expected: PASS / no type errors. The importer calls `upsertProjectWithTags({...})` with no second arg → defaults to `"overwrite"` → behavior unchanged.

- [ ] **Step 9: Commit**

```bash
git add src/db/content-write.ts src/app/api/admin/projects src/app/api/admin/posts
git commit -m "Reject duplicate slug on admin create with 409"
```

---

## Task 2: `DeleteButton` (confirm-then-delete control)

**Files:**
- Create: `src/app/admin/(dashboard)/DeleteButton.tsx`, `src/app/admin/(dashboard)/DeleteButton.module.css`
- Test: `src/app/admin/(dashboard)/DeleteButton.test.tsx`

**Interfaces:**
- Produces: `DeleteButton({ onConfirm, label }: { onConfirm: () => Promise<void>; label?: string })` — default export. First click arms (shows "Confirm?"); second click calls `onConfirm`. Auto-disarms after a resolved/rejected `onConfirm`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/(dashboard)/DeleteButton.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeleteButton from "./DeleteButton";

describe("DeleteButton", () => {
  it("requires a confirm click before calling onConfirm", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeleteButton onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/DeleteButton.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/app/admin/(dashboard)/DeleteButton.tsx
"use client";

import { useState } from "react";
import styles from "./DeleteButton.module.css";

export default function DeleteButton({
  onConfirm,
  label = "Delete",
}: {
  onConfirm: () => Promise<void>;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
      setArmed(false);
    }
  }

  return (
    <button
      type="button"
      className={armed ? styles.armed : styles.button}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? "Deleting…" : armed ? "Confirm?" : label}
    </button>
  );
}
```

```css
/* src/app/admin/(dashboard)/DeleteButton.module.css */
.button,
.armed {
  font: inherit;
  padding: 0.25rem 0.6rem;
  border-radius: 0.4rem;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(255, 46, 151, 0.4);
  color: #ff2e97;
}
.armed {
  background: #ff2e97;
  color: #0b0e14;
  border-color: #ff2e97;
}
.button:disabled,
.armed:disabled {
  opacity: 0.6;
  cursor: default;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/DeleteButton.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/DeleteButton.tsx" "src/app/admin/(dashboard)/DeleteButton.module.css" "src/app/admin/(dashboard)/DeleteButton.test.tsx"
git commit -m "Add confirm-then-delete admin DeleteButton"
```

---

## Task 3: `FormFields` primitives

**Files:**
- Create: `src/app/admin/(dashboard)/FormFields.tsx`, `src/app/admin/(dashboard)/FormFields.module.css`, `src/app/admin/(dashboard)/editor.module.css`
- Test: `src/app/admin/(dashboard)/FormFields.test.tsx`

**Interfaces:**
- Produces (all named exports from `FormFields.tsx`):
  - `TextField({ id, label, value, onChange, type?, required? }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean })`
  - `TextAreaField({ id, label, value, onChange, mono? }: { id; label; value: string; onChange: (v: string) => void; mono?: boolean })`
  - `CheckboxField({ id, label, checked, onChange }: { id; label; checked: boolean; onChange: (v: boolean) => void })`
  - `NumberField({ id, label, value, onChange }: { id; label; value: number; onChange: (v: number) => void })`
  - `SelectField({ id, label, value, onChange, options }: { id; label; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] })`
  - `DateField({ id, label, value, onChange }: { id; label; value: string; onChange: (v: string) => void })` — `value` is `""` or `YYYY-MM-DD`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/(dashboard)/FormFields.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextField, CheckboxField, SelectField } from "./FormFields";

describe("FormFields", () => {
  it("TextField reports typed value", () => {
    const onChange = vi.fn();
    render(<TextField id="t" label="Title" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hi" } });
    expect(onChange).toHaveBeenCalledWith("Hi");
  });

  it("CheckboxField reports boolean", () => {
    const onChange = vi.fn();
    render(<CheckboxField id="f" label="Featured" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Featured"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("SelectField reports selected value", () => {
    const onChange = vi.fn();
    render(
      <SelectField id="s" label="Status" value="published" onChange={onChange}
        options={[{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }]} />,
    );
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "draft" } });
    expect(onChange).toHaveBeenCalledWith("draft");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/FormFields.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the primitives**

```tsx
// src/app/admin/(dashboard)/FormFields.tsx
"use client";

import styles from "./FormFields.module.css";

export function TextField({
  id, label, value, onChange, type = "text", required = false,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input id={id} className={styles.input} type={type} value={value} required={required}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function TextAreaField({
  id, label, value, onChange, mono = false,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; mono?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <textarea id={id} className={mono ? styles.mono : styles.input} value={value} rows={mono ? 16 : 4}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function CheckboxField({
  id, label, checked, onChange,
}: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.checkRow}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function NumberField({
  id, label, value, onChange,
}: {
  id: string; label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input id={id} className={styles.input} type="number" value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function SelectField({
  id, label, value, onChange, options,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <select id={id} className={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );
}

export function DateField({
  id, label, value, onChange,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input id={id} className={styles.input} type="date" value={value}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
```

```css
/* src/app/admin/(dashboard)/FormFields.module.css */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #00f0ff;
}
.input {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border-radius: 0.5rem;
  background: #0b0e14;
  border: 1px solid rgba(0, 240, 255, 0.2);
  color: #f5f7fa;
}
.input:focus {
  outline: none;
  border-color: #00f0ff;
}
.mono {
  composes: input;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  line-height: 1.5;
  resize: vertical;
}
.checkRow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f5f7fa;
}
```

```css
/* src/app/admin/(dashboard)/editor.module.css */
.heading {
  margin: 0 0 1.5rem;
  font-family: var(--font-display, inherit);
  font-size: 1.75rem;
  color: #f5f7fa;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 48rem;
}
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}
.fieldset {
  border: 1px solid rgba(0, 240, 255, 0.15);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.legend {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #aab2c0;
  padding: 0 0.4rem;
}
.repeatRow {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.repeatRow input {
  flex: 1;
}
.actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.primary {
  font: inherit;
  padding: 0.55rem 1.1rem;
  border-radius: 0.5rem;
  border: 1px solid #00f0ff;
  background: #00f0ff;
  color: #0b0e14;
  font-weight: 600;
  cursor: pointer;
}
.primary:disabled {
  opacity: 0.6;
  cursor: default;
}
.ghost {
  font: inherit;
  padding: 0.5rem 0.9rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 240, 255, 0.3);
  background: transparent;
  color: #f5f7fa;
  cursor: pointer;
}
.error {
  color: #ff2e97;
  font-weight: 600;
  margin: 0;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/FormFields.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/FormFields.tsx" "src/app/admin/(dashboard)/FormFields.module.css" "src/app/admin/(dashboard)/FormFields.test.tsx" "src/app/admin/(dashboard)/editor.module.css"
git commit -m "Add admin form field primitives and editor layout styles"
```

---

## Task 4: Projects list page

**Files:**
- Create: `src/app/admin/(dashboard)/projects/page.tsx`, `src/app/admin/(dashboard)/list.module.css`
- Test: `src/app/admin/(dashboard)/projects/page.test.tsx`

**Interfaces:**
- Consumes: `ProjectService` (`list()`, `delete(id)`), `ProjectRowDTO`, `DeleteButton`.
- Produces: default export client page at `/admin/projects`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/(dashboard)/projects/page.test.tsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), del: vi.fn() }));
vi.mock("@/services/ProjectService", () => ({
  default: class { list = mocks.list; delete = mocks.del; },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ProjectsListPage from "./page";

describe("ProjectsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([
      { id: 1, slug: "alpha", title: "Alpha", status: "published", featured: true, startedAt: "2024-01-01" },
      { id: 2, slug: "beta", title: "Beta", status: "draft", featured: false, startedAt: null },
    ]);
  });

  it("renders a row per project with an edit link", async () => {
    render(<ProjectsListPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit alpha/i })).toHaveAttribute(
      "href", "/admin/projects/1/edit",
    );
  });

  it("deletes after confirm and refreshes the list", async () => {
    mocks.del.mockResolvedValue(undefined);
    render(<ProjectsListPage />);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    const delButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(delButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(mocks.del).toHaveBeenCalledWith("1"));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/projects/page.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the list page**

```tsx
// src/app/admin/(dashboard)/projects/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import ProjectService from "@/services/ProjectService";
import type { ProjectRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DeleteButton from "../DeleteButton";
import styles from "../list.module.css";

export default function ProjectsListPage() {
  const service = useMemo(() => new ProjectService(), []);
  const [rows, setRows] = useState<ProjectRowDTO[] | null>(null);

  const load = useCallback(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load projects"));
  }, [service]);

  useEffect(() => load(), [load]);

  async function remove(id: number, title: string) {
    try {
      await service.delete(String(id));
      toast.success(`Deleted “${title}”`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>Projects</h1>
        <Link className={styles.newLink} href="/admin/projects/new">New project</Link>
      </div>
      {rows === null ? (
        <p className={styles.muted}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className={styles.muted}>No projects yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Title</th><th>Status</th><th>Featured</th><th>Started</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.title}<span className={styles.slug}>/{p.slug}</span></td>
                <td>{p.status}</td>
                <td>{p.featured ? "★" : ""}</td>
                <td>{p.startedAt ?? "—"}</td>
                <td className={styles.rowActions}>
                  <Link className={styles.editLink} href={`/admin/projects/${p.id}/edit`}
                    aria-label={`Edit ${p.title}`}>Edit</Link>
                  <DeleteButton onConfirm={() => remove(p.id, p.title)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

```css
/* src/app/admin/(dashboard)/list.module.css */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.heading {
  margin: 0;
  font-family: var(--font-display, inherit);
  font-size: 1.75rem;
  color: #f5f7fa;
}
.newLink {
  padding: 0.5rem 0.9rem;
  border-radius: 0.5rem;
  border: 1px solid #00f0ff;
  color: #00f0ff;
  text-decoration: none;
  font-size: 0.9rem;
}
.muted { color: #aab2c0; }
.table {
  width: 100%;
  border-collapse: collapse;
  color: #f5f7fa;
}
.table th,
.table td {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid rgba(0, 240, 255, 0.12);
  font-size: 0.9rem;
}
.table th {
  color: #aab2c0;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
}
.slug {
  color: #aab2c0;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}
.rowActions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.editLink {
  color: #00f0ff;
  text-decoration: none;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/projects/page.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/projects/page.tsx" "src/app/admin/(dashboard)/projects/page.test.tsx" "src/app/admin/(dashboard)/list.module.css"
git commit -m "Add admin projects list page"
```

---

## Task 5: `ProjectForm` + create/edit pages

**Files:**
- Create: `src/app/admin/(dashboard)/ProjectForm.tsx`, `src/app/admin/(dashboard)/projects/new/page.tsx`, `src/app/admin/(dashboard)/projects/[id]/edit/page.tsx`
- Test: `src/app/admin/(dashboard)/ProjectForm.test.tsx`, `src/app/admin/(dashboard)/projects/[id]/edit/edit.test.tsx`

**Interfaces:**
- Consumes: `FormFields` exports, `ProjectInput`/`ProjectRowDTO`, `ApiError`, `ProjectService` (`get`, `save`, `edit`).
- Produces:
  - `ProjectForm({ initial, submitLabel, onSubmit }: { initial: ProjectInput; submitLabel: string; onSubmit: (input: ProjectInput) => Promise<void> })` — default export. Builds a `ProjectInput` from field state, calls `onSubmit`; on throw shows an inline `role="alert"` error and does not clear the form.
  - `emptyProjectInput(): ProjectInput` — named export from `ProjectForm.tsx`, used by the `new` page.

- [ ] **Step 1: Write the failing form test**

```tsx
// src/app/admin/(dashboard)/ProjectForm.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";
import ProjectForm, { emptyProjectInput } from "./ProjectForm";

describe("ProjectForm", () => {
  it("submits the assembled input", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProjectForm initial={emptyProjectInput()} submitLabel="Create" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "demo" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Demo" } });
    fireEvent.change(screen.getByLabelText("Summary"), { target: { value: "A demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "demo", title: "Demo", summary: "A demo", status: "draft" }),
      ),
    );
  });

  it("shows the server error and keeps the form on a 409", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, "A project with slug \"demo\" already exists"));
    render(<ProjectForm initial={{ ...emptyProjectInput(), slug: "demo", title: "D", summary: "s" }}
      submitLabel="Create" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i));
  });

  it("converts empty optional fields to null on submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProjectForm initial={{ ...emptyProjectInput(), slug: "demo", title: "D", summary: "s" }}
      submitLabel="Create" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category: null, liveUrl: null, startedAt: null })),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/ProjectForm.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ProjectForm`**

The form holds every field in local state as strings/booleans/numbers (never null), seeded from `initial` (null → `""`), and converts back to `ProjectInput` on submit (`""` → `null` for nullable fields).

```tsx
// src/app/admin/(dashboard)/ProjectForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import type { ProjectInput, Tech } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import {
  TextField, TextAreaField, CheckboxField, NumberField, SelectField, DateField,
} from "./FormFields";
import styles from "./editor.module.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export function emptyProjectInput(): ProjectInput {
  return {
    slug: "", title: "", summary: "", status: "draft", featured: false,
    category: null, role: null, dateLabel: null, sortOrder: 0,
    startedAt: null, completedAt: null, liveUrl: null, repoUrl: null,
    coverImage: null, content: null,
    techDescription: null, techTabImage: null, techTabImageAlt: null,
    designDescription: null, designTabImage: null, designTabImageAlt: null,
    tech: [],
  };
}

const s = (v: string | null) => v ?? "";
const nn = (v: string) => (v.trim() === "" ? null : v.trim());

export default function ProjectForm({
  initial, submitLabel, onSubmit,
}: {
  initial: ProjectInput;
  submitLabel: string;
  onSubmit: (input: ProjectInput) => Promise<void>;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [status, setStatus] = useState(initial.status);
  const [featured, setFeatured] = useState(initial.featured);
  const [category, setCategory] = useState(s(initial.category));
  const [role, setRole] = useState(s(initial.role));
  const [dateLabel, setDateLabel] = useState(s(initial.dateLabel));
  const [sortOrder, setSortOrder] = useState(initial.sortOrder);
  const [startedAt, setStartedAt] = useState(s(initial.startedAt));
  const [completedAt, setCompletedAt] = useState(s(initial.completedAt));
  const [liveUrl, setLiveUrl] = useState(s(initial.liveUrl));
  const [repoUrl, setRepoUrl] = useState(s(initial.repoUrl));
  const [coverImage, setCoverImage] = useState(s(initial.coverImage));
  const [content, setContent] = useState(s(initial.content));
  const [techDescription, setTechDescription] = useState(s(initial.techDescription));
  const [techTabImage, setTechTabImage] = useState(s(initial.techTabImage));
  const [techTabImageAlt, setTechTabImageAlt] = useState(s(initial.techTabImageAlt));
  const [designDescription, setDesignDescription] = useState(s(initial.designDescription));
  const [designTabImage, setDesignTabImage] = useState(s(initial.designTabImage));
  const [designTabImageAlt, setDesignTabImageAlt] = useState(s(initial.designTabImageAlt));
  const [tech, setTech] = useState<Tech[]>(initial.tech);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function setTechAt(i: number, patch: Partial<Tech>) {
    setTech((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const input: ProjectInput = {
      slug: slug.trim(), title: title.trim(), summary: summary.trim(),
      status, featured, category: nn(category), role: nn(role), dateLabel: nn(dateLabel),
      sortOrder, startedAt: nn(startedAt), completedAt: nn(completedAt),
      liveUrl: nn(liveUrl), repoUrl: nn(repoUrl), coverImage: nn(coverImage), content: nn(content),
      techDescription: nn(techDescription), techTabImage: nn(techTabImage), techTabImageAlt: nn(techTabImageAlt),
      designDescription: nn(designDescription), designTabImage: nn(designTabImage), designTabImageAlt: nn(designTabImageAlt),
      tech: tech.filter((t) => t.name.trim() !== "").map((t) => ({ name: t.name.trim(), iconUrl: nn(t.iconUrl ?? "") })),
    };
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <TextField id="slug" label="Slug" value={slug} onChange={setSlug} required />
        <SelectField id="status" label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>
      <TextField id="title" label="Title" value={title} onChange={setTitle} required />
      <TextAreaField id="summary" label="Summary" value={summary} onChange={setSummary} />
      <div className={styles.row}>
        <TextField id="category" label="Category" value={category} onChange={setCategory} />
        <TextField id="role" label="Role" value={role} onChange={setRole} />
        <TextField id="dateLabel" label="Date label" value={dateLabel} onChange={setDateLabel} />
        <NumberField id="sortOrder" label="Sort order" value={sortOrder} onChange={setSortOrder} />
      </div>
      <div className={styles.row}>
        <DateField id="startedAt" label="Started at" value={startedAt} onChange={setStartedAt} />
        <DateField id="completedAt" label="Completed at" value={completedAt} onChange={setCompletedAt} />
      </div>
      <div className={styles.row}>
        <TextField id="liveUrl" label="Live URL" value={liveUrl} onChange={setLiveUrl} />
        <TextField id="repoUrl" label="Repo URL" value={repoUrl} onChange={setRepoUrl} />
        <TextField id="coverImage" label="Cover image" value={coverImage} onChange={setCoverImage} />
      </div>
      <CheckboxField id="featured" label="Featured" checked={featured} onChange={setFeatured} />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Detail-page tabs</legend>
        <TextAreaField id="techDescription" label="Tech description" value={techDescription} onChange={setTechDescription} />
        <div className={styles.row}>
          <TextField id="techTabImage" label="Tech tab image" value={techTabImage} onChange={setTechTabImage} />
          <TextField id="techTabImageAlt" label="Tech tab image alt" value={techTabImageAlt} onChange={setTechTabImageAlt} />
        </div>
        <TextAreaField id="designDescription" label="Design description" value={designDescription} onChange={setDesignDescription} />
        <div className={styles.row}>
          <TextField id="designTabImage" label="Design tab image" value={designTabImage} onChange={setDesignTabImage} />
          <TextField id="designTabImageAlt" label="Design tab image alt" value={designTabImageAlt} onChange={setDesignTabImageAlt} />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Tech stack</legend>
        {tech.map((t, i) => (
          <div className={styles.repeatRow} key={i}>
            <input aria-label={`Tech name ${i + 1}`} placeholder="Name" value={t.name}
              onChange={(e) => setTechAt(i, { name: e.target.value })} />
            <input aria-label={`Tech icon URL ${i + 1}`} placeholder="Icon URL (optional)" value={t.iconUrl ?? ""}
              onChange={(e) => setTechAt(i, { iconUrl: e.target.value })} />
            <button type="button" className={styles.ghost}
              onClick={() => setTech((rows) => rows.filter((_, idx) => idx !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className={styles.ghost}
          onClick={() => setTech((rows) => [...rows, { name: "", iconUrl: null }])}>Add tech</button>
      </fieldset>

      <TextAreaField id="content" label="Content (MDX)" value={content} onChange={setContent} mono />

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run the form test to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/ProjectForm.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Implement the `new` page**

```tsx
// src/app/admin/(dashboard)/projects/new/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ProjectService from "@/services/ProjectService";
import type { ProjectInput } from "@/services/types";
import ProjectForm, { emptyProjectInput } from "../../ProjectForm";
import styles from "../../editor.module.css";

export default function NewProjectPage() {
  const service = useMemo(() => new ProjectService(), []);
  const router = useRouter();

  async function onSubmit(input: ProjectInput) {
    await service.save(input);
    toast.success(`Created “${input.title}”`);
    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <div>
      <h1 className={styles.heading}>New project</h1>
      <ProjectForm initial={emptyProjectInput()} submitLabel="Create" onSubmit={onSubmit} />
    </div>
  );
}
```

- [ ] **Step 6: Implement the `[id]/edit` page**

```tsx
// src/app/admin/(dashboard)/projects/[id]/edit/page.tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ProjectService from "@/services/ProjectService";
import type { ProjectInput, ProjectRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import ProjectForm from "../../../ProjectForm";
import styles from "../../../editor.module.css";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = useMemo(() => new ProjectService(), []);
  const router = useRouter();
  const [initial, setInitial] = useState<ProjectRowDTO | null>(null);

  useEffect(() => {
    service
      .get(id)
      .then(setInitial)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load project"));
  }, [service, id]);

  async function onSubmit(input: ProjectInput) {
    await service.edit(id, input);
    toast.success(`Saved “${input.title}”`);
    router.push("/admin/projects");
    router.refresh();
  }

  if (!initial) return <p className={styles.heading}>Loading…</p>;

  return (
    <div>
      <h1 className={styles.heading}>Edit project</h1>
      <ProjectForm initial={initial} submitLabel="Save changes" onSubmit={onSubmit} />
    </div>
  );
}
```

- [ ] **Step 7: Write the edit-page test**

```tsx
// src/app/admin/(dashboard)/projects/[id]/edit/edit.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";

const mocks = vi.hoisted(() => ({ get: vi.fn(), edit: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/ProjectService", () => ({
  default: class { get = mocks.get; edit = mocks.edit; },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import EditProjectPage from "./page";

const dto = {
  id: 1, slug: "alpha", title: "Alpha", summary: "s", status: "published", featured: false,
  category: null, role: null, dateLabel: null, sortOrder: 0, startedAt: null, completedAt: null,
  liveUrl: null, repoUrl: null, coverImage: null, content: null,
  techDescription: null, techTabImage: null, techTabImageAlt: null,
  designDescription: null, designTabImage: null, designTabImageAlt: null, tech: [],
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("EditProjectPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prefills the form and saves through the service", async () => {
    mocks.get.mockResolvedValue(dto);
    mocks.edit.mockResolvedValue(dto);
    render(<EditProjectPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Alpha"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.edit).toHaveBeenCalledWith("1", expect.objectContaining({ slug: "alpha" })));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/admin/projects"));
  });

  it("does not navigate when the save fails", async () => {
    mocks.get.mockResolvedValue(dto);
    mocks.edit.mockRejectedValue(new ApiError(400, "Missing or empty \"title\""));
    render(<EditProjectPage params={Promise.resolve({ id: "1" })} />);

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Alpha"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Run the edit-page test to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/projects/[id]/edit/edit.test.tsx"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(dashboard)/ProjectForm.tsx" "src/app/admin/(dashboard)/ProjectForm.test.tsx" "src/app/admin/(dashboard)/projects/new" "src/app/admin/(dashboard)/projects/[id]"
git commit -m "Add admin project create/edit form and pages"
```

---

## Task 6: Posts list page

**Files:**
- Create: `src/app/admin/(dashboard)/posts/page.tsx`
- Test: `src/app/admin/(dashboard)/posts/page.test.tsx`

**Interfaces:**
- Consumes: `PostService` (`list()`, `delete(id)`), `PostRowDTO`, `DeleteButton`, `list.module.css`.
- Produces: default export client page at `/admin/posts`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/(dashboard)/posts/page.test.tsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), del: vi.fn() }));
vi.mock("@/services/PostService", () => ({
  default: class { list = mocks.list; delete = mocks.del; },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PostsListPage from "./page";

describe("PostsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([
      { id: 5, slug: "hello", title: "Hello", status: "published", featured: false, publishedAt: "2026-02-01" },
    ]);
  });

  it("renders a row per post with an edit link", async () => {
    render(<PostsListPage />);
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /edit hello/i })).toHaveAttribute(
      "href", "/admin/posts/5/edit",
    );
  });

  it("deletes after confirm", async () => {
    mocks.del.mockResolvedValue(undefined);
    render(<PostsListPage />);
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(mocks.del).toHaveBeenCalledWith("5"));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/posts/page.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the posts list page**

Mirror the projects list, swapping the service, type, column (`publishedAt` instead of `startedAt`), and links.

```tsx
// src/app/admin/(dashboard)/posts/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import PostService from "@/services/PostService";
import type { PostRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DeleteButton from "../DeleteButton";
import styles from "../list.module.css";

export default function PostsListPage() {
  const service = useMemo(() => new PostService(), []);
  const [rows, setRows] = useState<PostRowDTO[] | null>(null);

  const load = useCallback(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load posts"));
  }, [service]);

  useEffect(() => load(), [load]);

  async function remove(id: number, title: string) {
    try {
      await service.delete(String(id));
      toast.success(`Deleted “${title}”`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>Posts</h1>
        <Link className={styles.newLink} href="/admin/posts/new">New post</Link>
      </div>
      {rows === null ? (
        <p className={styles.muted}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className={styles.muted}>No posts yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Title</th><th>Status</th><th>Featured</th><th>Published</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.title}<span className={styles.slug}>/{p.slug}</span></td>
                <td>{p.status}</td>
                <td>{p.featured ? "★" : ""}</td>
                <td>{p.publishedAt ?? "—"}</td>
                <td className={styles.rowActions}>
                  <Link className={styles.editLink} href={`/admin/posts/${p.id}/edit`}
                    aria-label={`Edit ${p.title}`}>Edit</Link>
                  <DeleteButton onConfirm={() => remove(p.id, p.title)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/posts/page.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/posts/page.tsx" "src/app/admin/(dashboard)/posts/page.test.tsx"
git commit -m "Add admin posts list page"
```

---

## Task 7: `PostForm` + create/edit pages

**Files:**
- Create: `src/app/admin/(dashboard)/PostForm.tsx`, `src/app/admin/(dashboard)/posts/new/page.tsx`, `src/app/admin/(dashboard)/posts/[id]/edit/page.tsx`
- Test: `src/app/admin/(dashboard)/PostForm.test.tsx`, `src/app/admin/(dashboard)/posts/[id]/edit/edit.test.tsx`

**Interfaces:**
- Consumes: `FormFields` exports, `PostInput`/`PostRowDTO`, `ApiError`, `PostService` (`get`, `save`, `edit`).
- Produces:
  - `PostForm({ initial, submitLabel, onSubmit }: { initial: PostInput; submitLabel: string; onSubmit: (input: PostInput) => Promise<void> })` — default export.
  - `emptyPostInput(): PostInput` — named export.

- [ ] **Step 1: Write the failing form test**

```tsx
// src/app/admin/(dashboard)/PostForm.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";
import PostForm, { emptyPostInput } from "./PostForm";

describe("PostForm", () => {
  it("submits the assembled input including tags", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PostForm initial={emptyPostInput()} submitLabel="Create" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "hello" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText("Excerpt"), { target: { value: "Hi there" } });

    fireEvent.change(screen.getByLabelText(/add tag/i), { target: { value: "Next" } });
    fireEvent.click(screen.getByRole("button", { name: /add tag/i }));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "hello", title: "Hello", excerpt: "Hi there", status: "draft", tags: ["Next"] }),
      ),
    );
  });

  it("shows the server error on a 409", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, "A post with slug \"hello\" already exists"));
    render(<PostForm initial={{ ...emptyPostInput(), slug: "hello", title: "H", excerpt: "e" }}
      submitLabel="Create" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/PostForm.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PostForm`**

```tsx
// src/app/admin/(dashboard)/PostForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import type { PostInput } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import {
  TextField, TextAreaField, CheckboxField, NumberField, SelectField, DateField,
} from "./FormFields";
import styles from "./editor.module.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export function emptyPostInput(): PostInput {
  return {
    slug: "", title: "", excerpt: "", status: "draft", featured: false,
    publishedAt: null, coverImage: null, content: null, readingMinutes: 1, tags: [],
  };
}

const s = (v: string | null) => v ?? "";
const nn = (v: string) => (v.trim() === "" ? null : v.trim());

export default function PostForm({
  initial, submitLabel, onSubmit,
}: {
  initial: PostInput;
  submitLabel: string;
  onSubmit: (input: PostInput) => Promise<void>;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [title, setTitle] = useState(initial.title);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [status, setStatus] = useState(initial.status);
  const [featured, setFeatured] = useState(initial.featured);
  const [publishedAt, setPublishedAt] = useState(s(initial.publishedAt));
  const [coverImage, setCoverImage] = useState(s(initial.coverImage));
  const [content, setContent] = useState(s(initial.content));
  const [readingMinutes, setReadingMinutes] = useState(initial.readingMinutes);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function addTag() {
    const t = tagDraft.trim();
    if (t === "" || tags.includes(t)) {
      setTagDraft("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const input: PostInput = {
      slug: slug.trim(), title: title.trim(), excerpt: excerpt.trim(),
      status, featured, publishedAt: nn(publishedAt), coverImage: nn(coverImage),
      content: nn(content), readingMinutes, tags,
    };
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <TextField id="slug" label="Slug" value={slug} onChange={setSlug} required />
        <SelectField id="status" label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>
      <TextField id="title" label="Title" value={title} onChange={setTitle} required />
      <TextAreaField id="excerpt" label="Excerpt" value={excerpt} onChange={setExcerpt} />
      <div className={styles.row}>
        <DateField id="publishedAt" label="Published at" value={publishedAt} onChange={setPublishedAt} />
        <TextField id="coverImage" label="Cover image" value={coverImage} onChange={setCoverImage} />
        <NumberField id="readingMinutes" label="Reading minutes" value={readingMinutes} onChange={setReadingMinutes} />
      </div>
      <CheckboxField id="featured" label="Featured" checked={featured} onChange={setFeatured} />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Topic tags</legend>
        <div className={styles.repeatRow}>
          {tags.map((t) => (
            <button type="button" key={t} className={styles.ghost}
              onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>{t} ✕</button>
          ))}
        </div>
        <div className={styles.repeatRow}>
          <input aria-label="Add tag" placeholder="Add tag" value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
          <button type="button" className={styles.ghost} onClick={addTag}>Add tag</button>
        </div>
      </fieldset>

      <TextAreaField id="content" label="Content (MDX)" value={content} onChange={setContent} mono />

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run the form test to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/PostForm.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Implement the `new` page**

```tsx
// src/app/admin/(dashboard)/posts/new/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import PostService from "@/services/PostService";
import type { PostInput } from "@/services/types";
import PostForm, { emptyPostInput } from "../../PostForm";
import styles from "../../editor.module.css";

export default function NewPostPage() {
  const service = useMemo(() => new PostService(), []);
  const router = useRouter();

  async function onSubmit(input: PostInput) {
    await service.save(input);
    toast.success(`Created “${input.title}”`);
    router.push("/admin/posts");
    router.refresh();
  }

  return (
    <div>
      <h1 className={styles.heading}>New post</h1>
      <PostForm initial={emptyPostInput()} submitLabel="Create" onSubmit={onSubmit} />
    </div>
  );
}
```

- [ ] **Step 6: Implement the `[id]/edit` page**

```tsx
// src/app/admin/(dashboard)/posts/[id]/edit/page.tsx
"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import PostService from "@/services/PostService";
import type { PostInput, PostRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import PostForm from "../../../PostForm";
import styles from "../../../editor.module.css";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = useMemo(() => new PostService(), []);
  const router = useRouter();
  const [initial, setInitial] = useState<PostRowDTO | null>(null);

  useEffect(() => {
    service
      .get(id)
      .then(setInitial)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load post"));
  }, [service, id]);

  async function onSubmit(input: PostInput) {
    await service.edit(id, input);
    toast.success(`Saved “${input.title}”`);
    router.push("/admin/posts");
    router.refresh();
  }

  if (!initial) return <p className={styles.heading}>Loading…</p>;

  return (
    <div>
      <h1 className={styles.heading}>Edit post</h1>
      <PostForm initial={initial} submitLabel="Save changes" onSubmit={onSubmit} />
    </div>
  );
}
```

Note: `PostService` has no `get` method today (`ProjectService` doesn't either, but Task 5's project edit page relies on `ProjectService.get`, which **does** exist — see `ProjectService.ts`). Confirm `PostService.get` exists before this step; it does (`PostService.ts` defines `get(id)`). No service change needed.

- [ ] **Step 7: Write the edit-page test**

```tsx
// src/app/admin/(dashboard)/posts/[id]/edit/edit.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/ApiError";

const mocks = vi.hoisted(() => ({ get: vi.fn(), edit: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/PostService", () => ({
  default: class { get = mocks.get; edit = mocks.edit; },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import EditPostPage from "./page";

const dto = {
  id: 5, slug: "hello", title: "Hello", excerpt: "e", status: "published", featured: false,
  publishedAt: null, coverImage: null, content: null, readingMinutes: 2, tags: ["Next"],
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("EditPostPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prefills and saves through the service", async () => {
    mocks.get.mockResolvedValue(dto);
    mocks.edit.mockResolvedValue(dto);
    render(<EditPostPage params={Promise.resolve({ id: "5" })} />);
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Hello"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.edit).toHaveBeenCalledWith("5", expect.objectContaining({ slug: "hello", tags: ["Next"] })));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/admin/posts"));
  });

  it("does not navigate when the save fails", async () => {
    mocks.get.mockResolvedValue(dto);
    mocks.edit.mockRejectedValue(new ApiError(400, "bad"));
    render(<EditPostPage params={Promise.resolve({ id: "5" })} />);
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Hello"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Run the edit-page test to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/posts/[id]/edit/edit.test.tsx"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(dashboard)/PostForm.tsx" "src/app/admin/(dashboard)/PostForm.test.tsx" "src/app/admin/(dashboard)/posts/new" "src/app/admin/(dashboard)/posts/[id]"
git commit -m "Add admin post create/edit form and pages"
```

---

## Task 8: Full verification

**Files:** none.

- [ ] **Step 1: Run the full test suite**

Run: `npm run db:up && npm test 2>&1 | tail -25`
Expected: all new admin tests pass; total failures ≤ the baseline recorded in Task 1 Step 0 (~5 `Timeline`/`about`). If any admin test fails, fix it before proceeding.

- [ ] **Step 2: Type-check + lint via a production build into the verify dir**

Run: `npm run build:verify 2>&1 | tail -30`
Expected: build succeeds (it type-checks and lints). It must NOT be `npm run build` while `next dev` is running. If `next dev` is not running, plain `npm run build` is also acceptable, but `build:verify` is safe either way.

- [ ] **Step 3: Smoke-test the routes against the verify build (optional but recommended)**

Run: `npm run start:verify -p 3100` in one shell, then in another:
`for p in /admin/projects /admin/projects/new /admin/posts /admin/posts/new; do echo -n "$p "; curl -s -o /dev/null -w '%{http_code}\n' localhost:3100$p; done`
Expected: each returns `307`/`302` (redirect to `/admin/login`, since unauthenticated) — confirming the routes resolve and the middleware gate still covers them. A `404` means a page file is misplaced.

- [ ] **Step 4: Final commit if anything changed during verification**

```bash
git add -A
git commit -m "Phase 3b: verify admin projects/posts editor build" || echo "nothing to commit"
```

---

## Self-Review Notes (addressed)

- **Spec coverage:** routes & structure → Tasks 4–7; project form fields (incl. 6 tab fields + tech rows) → Task 5; post form (tags string list, readingMinutes) → Task 7; slug-collision 409 gated so the importer is untouched → Task 1; delete-confirm → Task 2; toasts from handlers not render → Tasks 4–7; client components calling services → all UI tasks; testing (list/form/409/importer regression) → Tasks 1,4–7; verification with `build:verify` + `db:up` → Task 8.
- **Out-of-scope honored:** no `/admin/tags` or `/admin/submissions` (3c), no live MDX preview, no image upload, no `readingMinutes` auto-calc, no schema/`drizzle` changes, no new deps.
- **Type consistency:** `onSubmit: (input: ProjectInput|PostInput) => Promise<void>`, `emptyProjectInput`/`emptyPostInput`, `SlugConflictError`, and `{ onSlugConflict: "reject" }` are used identically wherever referenced. `service.delete(String(id))` matches `BaseApiService.delete(id: string)`. `ProjectService.get`/`PostService.get` both exist.
