# Admin Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin dashboard's horizontal top nav with a dark left sidebar that collapses to an icon rail on desktop and becomes an off-canvas drawer on mobile.

**Architecture:** A client `AdminShell` wrapper owns the layout state (`collapsed`, `drawerOpen`) and renders an `AdminSidebar` plus a `<main>` region together, so the content's left offset tracks the sidebar width. The server `(dashboard)/layout.tsx` just renders `<AdminShell>{children}</AdminShell>`. Sidebar width and drawer transform are published by the shell as inherited CSS custom properties (`--sidebar-w`, `--sidebar-x`) so the two CSS Modules stay decoupled.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, CSS Modules, Vitest + @testing-library/react.

## Global Constraints

- Styling is **CSS Modules only** — never Tailwind, no `@tailwind`, no `tailwind.config.ts`, no postcss/autoprefixer.
- **No new runtime dependency.** Icons are hand-written inline SVG (same convention as `ContactMethods`).
- Neon tokens: page bg `#0b0e14`, surface `#12161f`, muted text `#aab2c0`, bright text `#f5f7fa`, turquoise accent `#00f0ff`.
- Breakpoint: `768px` (desktop ≥768px; mobile ≤767px), consistent with `useDeviceTier`.
- `localStorage` access is wrapped in `try/catch` (private-mode safe) and only touched in effects/handlers, never during render (hydration safety).
- Tests use `fireEvent` from `@testing-library/react` (the project convention) — do NOT add `@testing-library/user-event`.
- Run tests with `npx vitest run <path>`. **Never run `npm run build` while `next dev` is running** — use `npm run build:verify`, and bring the DB up first with `npm run db:up`.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: `AdminSidebar` component

The nav itself: brand, five icon+label links, a desktop collapse toggle, and the reused `LogoutButton`. Pure given its props (`collapsed`, `onToggleCollapsed`); reads the current path via `usePathname`.

**Files:**
- Create: `src/app/admin/AdminSidebar.tsx`
- Create: `src/app/admin/AdminSidebar.module.css`
- Test: `src/app/admin/AdminSidebar.test.tsx`

**Interfaces:**
- Consumes: `LogoutButton` (default export, `src/app/admin/LogoutButton.tsx`).
- Produces:
  - `export const LINKS: ReadonlyArray<{ href: string; label: string; icon: ReactNode }>`
  - `export function isActive(pathname: string, href: string): boolean`
  - `export default function AdminSidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }): JSX.Element` — renders `<nav id="admin-sidebar" data-collapsed={collapsed} aria-label="Admin">`.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/AdminSidebar.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminSidebar from "./AdminSidebar";

describe("AdminSidebar", () => {
  it("renders all five admin links and a sign-out control", () => {
    mocks.usePathname.mockReturnValue("/admin");
    render(<AdminSidebar collapsed={false} onToggleCollapsed={vi.fn()} />);
    for (const label of ["Dashboard", "Projects", "Posts", "Tags", "Submissions"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("marks the link matching the current path as current", () => {
    mocks.usePathname.mockReturnValue("/admin/projects");
    render(<AdminSidebar collapsed={false} onToggleCollapsed={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("treats /admin as current only on the exact dashboard path", () => {
    mocks.usePathname.mockReturnValue("/admin/posts");
    render(<AdminSidebar collapsed={false} onToggleCollapsed={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("keeps links queryable by name when collapsed", () => {
    mocks.usePathname.mockReturnValue("/admin");
    render(<AdminSidebar collapsed={true} onToggleCollapsed={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
  });

  it("exposes the collapse toggle state via aria-expanded and fires the callback", () => {
    mocks.usePathname.mockReturnValue("/admin");
    const onToggle = vi.fn();
    render(<AdminSidebar collapsed={false} onToggleCollapsed={onToggle} />);
    const toggle = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/admin/AdminSidebar.test.tsx`
Expected: FAIL — cannot resolve `./AdminSidebar`.

- [ ] **Step 3: Write the component**

Create `src/app/admin/AdminSidebar.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import styles from "./AdminSidebar.module.css";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

const DashboardIcon = () => (
  <svg {...iconProps}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
);
const ProjectsIcon = () => (
  <svg {...iconProps}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
);
const PostsIcon = () => (
  <svg {...iconProps}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M13 3v6h6" /><path d="M9 13h6M9 17h6" /></svg>
);
const TagsIcon = () => (
  <svg {...iconProps}><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
);
const SubmissionsIcon = () => (
  <svg {...iconProps}><path d="M3 5h18v14H3z" /><path d="M3 7l9 6 9-6" /></svg>
);
const ChevronIcon = () => (
  <svg {...iconProps}><path d="M15 6l-6 6 6 6" /></svg>
);

export const LINKS: ReadonlyArray<{ href: string; label: string; icon: ReactNode }> = [
  { href: "/admin", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/admin/projects", label: "Projects", icon: <ProjectsIcon /> },
  { href: "/admin/posts", label: "Posts", icon: <PostsIcon /> },
  { href: "/admin/tags", label: "Tags", icon: <TagsIcon /> },
  { href: "/admin/submissions", label: "Submissions", icon: <SubmissionsIcon /> },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      id="admin-sidebar"
      className={styles.nav}
      data-collapsed={collapsed}
      aria-label="Admin"
    >
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>SK</span>
        <span className={styles.label}>Admin</span>
      </div>
      <ul className={styles.links}>
        {LINKS.map(({ href, label, icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={styles.link}
              title={collapsed ? label : undefined}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <span className={styles.icon}>{icon}</span>
              <span className={styles.label}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className={styles.spacer} />
      <button
        type="button"
        className={styles.toggle}
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className={styles.toggleIcon} data-collapsed={collapsed}>
          <ChevronIcon />
        </span>
        <span className={styles.label}>Collapse</span>
      </button>
      <div className={styles.logout}>
        <LogoutButton />
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Write the CSS Module**

Create `src/app/admin/AdminSidebar.module.css`. Width (`--sidebar-w`) and drawer transform (`--sidebar-x`) are inherited from the shell (Task 2); this module only consumes them:

```css
.nav {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
  width: var(--sidebar-w, 15rem);
  transform: var(--sidebar-x, none);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 0.75rem;
  background: #12161f;
  border-right: 1px solid rgba(0, 240, 255, 0.15);
  overflow: hidden;
  transition: width 0.2s ease, transform 0.2s ease;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.5rem 1rem;
  font-family: var(--font-display, inherit);
  font-weight: 700;
  color: #00f0ff;
  letter-spacing: 0.02em;
}
.brandMark {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.4rem;
  background: rgba(0, 240, 255, 0.12);
  font-size: 0.75rem;
}
.links {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.link,
.toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.55rem 0.5rem;
  border-radius: 0.5rem;
  border-left: 2px solid transparent;
  color: #aab2c0;
  text-decoration: none;
  font-size: 0.9rem;
  background: none;
  cursor: pointer;
  text-align: left;
}
.link:hover,
.toggle:hover {
  color: #f5f7fa;
  background: rgba(255, 255, 255, 0.04);
}
.link[aria-current="page"] {
  color: #f5f7fa;
  border-left-color: #00f0ff;
  background: rgba(0, 240, 255, 0.08);
}
.icon,
.toggleIcon {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
}
.toggleIcon[data-collapsed="true"] {
  transform: rotate(180deg);
}
.spacer {
  flex: 1;
}
.toggle {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 2px solid transparent;
}
.logout {
  padding-top: 0.5rem;
}

/* Collapsed rail: hide every text label but keep it in the accessible tree. */
.nav[data-collapsed="true"] .label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Mobile drawer: collapse rail concept does not apply — always show labels, hide the toggle. */
@media (max-width: 767px) {
  .toggle {
    display: none;
  }
  .nav[data-collapsed="true"] .label {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    clip-path: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav {
    transition: none;
  }
}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `npx vitest run src/app/admin/AdminSidebar.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/AdminSidebar.tsx src/app/admin/AdminSidebar.module.css src/app/admin/AdminSidebar.test.tsx
git commit -m "$(cat <<'EOF'
Add AdminSidebar with icon rail and collapse toggle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `AdminShell` wrapper

Owns `collapsed` (persisted) and `drawerOpen`, renders the mobile top bar + hamburger, the sidebar, the backdrop, and `<main>`. Publishes `--sidebar-w` / `--sidebar-x` for both modules to consume.

**Files:**
- Create: `src/app/admin/AdminShell.tsx`
- Create: `src/app/admin/AdminShell.module.css`
- Test: `src/app/admin/AdminShell.test.tsx`

**Interfaces:**
- Consumes: `AdminSidebar` (default export from Task 1).
- Produces: `export default function AdminShell({ children }: { children: React.ReactNode }): JSX.Element`. Renders `<div className={styles.shell} data-collapsed={collapsed} data-drawer-open={drawerOpen}>`. Hamburger has `aria-controls="admin-sidebar"` and `aria-expanded={drawerOpen}`.

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/AdminShell.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminShell from "./AdminShell";

describe("AdminShell", () => {
  beforeEach(() => {
    mocks.usePathname.mockReturnValue("/admin");
    localStorage.clear();
  });

  it("renders its children", () => {
    render(<AdminShell><p>hello admin</p></AdminShell>);
    expect(screen.getByText("hello admin")).toBeInTheDocument();
  });

  it("toggles the mobile drawer open state via the menu button", () => {
    render(<AdminShell><p>content</p></AdminShell>);
    const menu = screen.getByRole("button", { name: /open menu/i });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(menu);
    expect(screen.getByRole("button", { name: /close menu/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("closes an open drawer on Escape", () => {
    render(<AdminShell><p>content</p></AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("starts collapsed when localStorage says so", () => {
    localStorage.setItem("admin-sidebar-collapsed", "true");
    render(<AdminShell><p>content</p></AdminShell>);
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("persists the collapsed state when toggled", () => {
    render(<AdminShell><p>content</p></AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(localStorage.getItem("admin-sidebar-collapsed")).toBe("true");
  });

  it("closes the drawer when the route changes", () => {
    const { rerender } = render(<AdminShell><p>content</p></AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();
    mocks.usePathname.mockReturnValue("/admin/posts");
    rerender(<AdminShell><p>content</p></AdminShell>);
    expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/admin/AdminShell.test.tsx`
Expected: FAIL — cannot resolve `./AdminShell`.

- [ ] **Step 3: Write the component**

Create `src/app/admin/AdminShell.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import styles from "./AdminShell.module.css";

const STORAGE_KEY = "admin-sidebar-collapsed";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Read the persisted collapse state after mount so SSR and first render agree.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      /* private mode — keep default */
    }
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Escape closes an open drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className={styles.shell} data-collapsed={collapsed} data-drawer-open={drawerOpen}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-controls="admin-sidebar"
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden focusable="false">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className={styles.topbarBrand}>Admin</span>
      </header>
      <AdminSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      {drawerOpen && (
        <div className={styles.backdrop} onClick={() => setDrawerOpen(false)} aria-hidden />
      )}
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Write the CSS Module**

Create `src/app/admin/AdminShell.module.css`. This is the single source of truth for the sidebar width and drawer transform:

```css
.shell {
  --sidebar-w: 15rem;
  --sidebar-x: none;
  min-height: 100dvh;
  background: #0b0e14;
  color: #f5f7fa;
}
.shell[data-collapsed="true"] {
  --sidebar-w: 3.5rem;
}

.main {
  margin-left: var(--sidebar-w);
  transition: margin-left 0.2s ease;
}
.content {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* The mobile top bar and backdrop are desktop-hidden. */
.topbar {
  display: none;
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.5);
}

@media (max-width: 767px) {
  .shell {
    /* Off-canvas by default; the drawer slides it in. Width is always full here. */
    --sidebar-w: 15rem;
    --sidebar-x: translateX(-100%);
  }
  .shell[data-drawer-open="true"] {
    --sidebar-x: none;
  }
  .main {
    margin-left: 0;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: #12161f;
    border-bottom: 1px solid rgba(0, 240, 255, 0.15);
  }
  .menuButton {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.5rem;
    background: none;
    color: #f5f7fa;
    cursor: pointer;
  }
  .topbarBrand {
    font-family: var(--font-display, inherit);
    font-weight: 700;
    color: #00f0ff;
    letter-spacing: 0.02em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .main {
    transition: none;
  }
}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `npx vitest run src/app/admin/AdminShell.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/AdminShell.tsx src/app/admin/AdminShell.module.css src/app/admin/AdminShell.test.tsx
git commit -m "$(cat <<'EOF'
Add AdminShell wrapper owning collapse and drawer state

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Wire the shell into the dashboard layout and remove `AdminNav`

Swap the `(dashboard)` layout over to `AdminShell` and delete the old horizontal nav and its now-unused styles/test.

**Files:**
- Modify: `src/app/admin/(dashboard)/layout.tsx`
- Delete: `src/app/admin/(dashboard)/layout.module.css`
- Delete: `src/app/admin/AdminNav.tsx`
- Delete: `src/app/admin/AdminNav.module.css`
- Delete: `src/app/admin/AdminNav.test.tsx`

**Interfaces:**
- Consumes: `AdminShell` (default export from Task 2).

- [ ] **Step 1: Confirm `AdminNav` has no other importers**

Run: `grep -rn "AdminNav" src --include=*.tsx --include=*.ts`
Expected: matches only in `AdminNav.tsx`, `AdminNav.test.tsx`, and `(dashboard)/layout.tsx`. If anything else imports it, stop and reassess.

- [ ] **Step 2: Rewrite the dashboard layout**

Replace the entire contents of `src/app/admin/(dashboard)/layout.tsx` with:

```tsx
import AdminShell from "../AdminShell";

// Wraps the authenticated admin pages only. /admin/login lives outside this
// group (directly under admin/layout.tsx), so the sidebar never renders on the
// login screen. The centered content container now lives inside AdminShell.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
```

- [ ] **Step 3: Delete the old nav and unused layout styles**

Run:

```bash
git rm src/app/admin/AdminNav.tsx src/app/admin/AdminNav.module.css src/app/admin/AdminNav.test.tsx src/app/admin/(dashboard)/layout.module.css
```

- [ ] **Step 4: Run the full admin test suite**

Run: `npx vitest run src/app/admin`
Expected: PASS. No test references the deleted `AdminNav` (its coverage moved to `AdminSidebar.test.tsx` in Task 1).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Production build verification**

Run:

```bash
npm run db:up
npm run build:verify
```

Expected: build succeeds. (Do NOT use `npm run build` if `next dev` is running — it shares the dev output dir and strips site-wide CSS.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Replace admin top nav with the collapsible sidebar shell

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Manual verification (after Task 3)

With the DB up (`npm run db:up`), run `npm run dev` and visit `/admin` (log in first):
- Desktop ≥768px: sidebar on the left with icon+label links; the active route shows the turquoise left indicator. Click the collapse toggle → sidebar shrinks to an icon rail and the content reflows; reload → it stays collapsed. Hover a rail icon → tooltip shows the label.
- Resize below 768px: the sidebar disappears behind a top bar with a hamburger. Tap it → drawer slides in over a backdrop. Click a link, click the backdrop, or press Escape → it closes.
- With OS "reduce motion" on, the width/slide transitions are instant.

## Self-Review Notes

- **Spec coverage:** AdminShell/AdminSidebar split (Task 1–2), desktop rail + persistence (Task 2), mobile drawer + Escape + route-change close (Task 2), inline SVG icons (Task 1), neon tokens + 768px breakpoint + reduced motion (Task 1–2 CSS), CSS-var decoupling of the two modules (Task 2 defines `--sidebar-w`/`--sidebar-x`, Task 1 consumes), removal of `AdminNav` + migration of its three tests (Task 1 + Task 3). All covered.
- **Accessibility:** collapsed labels are clipped (`clip-path`), not removed, so links stay queryable by name (Task 1 test asserts this) and usable by AT.
- **Hydration:** `localStorage` read only in a mount effect (Task 2), never during render.
- **Type consistency:** `AdminSidebar` props `{ collapsed, onToggleCollapsed }` and `AdminShell` `{ children }` are used identically across tasks; `STORAGE_KEY` value `"admin-sidebar-collapsed"` matches the spec and the Task 2 test.
