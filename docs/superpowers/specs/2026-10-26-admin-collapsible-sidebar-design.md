# Admin collapsible sidebar

**Date:** 2026-10-26
**Status:** Approved, pending implementation

## Goal

Replace the admin dashboard's horizontal top nav (`AdminNav`) with a dark
left-hand sidebar in the spirit of the Windmill React dashboard template:
icon + label nav items, a desktop collapse-to-icon-rail toggle, and a mobile
off-canvas drawer. Scope is `/admin` only — the public portfolio pages
(cyberpunk hero/scroll) are untouched.

## Non-goals

- No change to public site chrome (`Header`, `Footer`).
- No new runtime dependency. Icons are hand-written inline SVG (same convention
  as `ContactMethods`).
- No nested/sub-menus. The five existing links stay flat.
- No global state store. Collapse/drawer state is local to the admin shell.

## Current state

- `src/app/admin/layout.tsx` (server) — chrome-free top-level wrapper; wraps
  `/admin/login` too, so it must stay nav-free.
- `src/app/admin/(dashboard)/layout.tsx` (server) — renders `<AdminNav />` then
  a centered `.content` container. Wraps authenticated pages only.
- `src/app/admin/AdminNav.tsx` (client) — horizontal nav: `LINKS` array
  (Dashboard, Projects, Posts, Tags, Submissions), `isActive()` helper,
  `LogoutButton`. `aria-current="page"` marks the active link.
- `src/app/admin/AdminNav.module.css`, `AdminNav.test.tsx`.

## Architecture (Approach A)

A client `AdminShell` wrapper owns the layout state and renders the sidebar and
content region together, so the content's left offset can track the collapse
state through a shared class. The server layout stays a server component.

```
(dashboard)/layout.tsx  (server)
  └─ <AdminShell>                 (client — owns collapsed + drawerOpen)
       ├─ mobile top bar          (hamburger + "Admin" brand; <768px only)
       ├─ <AdminSidebar/>         (client — brand, nav links, collapse toggle, LogoutButton)
       ├─ backdrop                (<768px, when drawerOpen)
       └─ <main>{children}</main> (left margin tracks `collapsed` on desktop)
```

### Components

**`src/app/admin/AdminShell.tsx` (client)**
- State: `collapsed` (desktop icon-rail, persisted) and `drawerOpen` (mobile).
- `collapsed` is persisted in `localStorage` under `admin-sidebar-collapsed`.
  Default is expanded (`false`). The persisted value is read in a mount effect,
  not during render, so SSR and first client render agree (avoids a hydration
  mismatch); a one-frame settle to the stored state is acceptable on an admin
  page. `localStorage` reads/writes are wrapped in try/catch (private mode).
- Renders a slim mobile top bar containing the hamburger button and the "Admin"
  brand (visible only `<768px`).
- Renders a backdrop div when `drawerOpen` (mobile); clicking it closes.
- Closes the drawer on `Escape` (keydown listener while open) and whenever
  `pathname` changes (effect), so navigating a link dismisses it.
- Passes `collapsed`, `onToggleCollapsed`, `drawerOpen`, `onCloseDrawer` down to
  `AdminSidebar`; sets `data-collapsed` / `data-drawer-open` attributes that CSS
  keys off for widths, transforms, and the `<main>` margin.

**`src/app/admin/AdminSidebar.tsx` (client)**
- Reuses the existing `LINKS` array and `isActive()` logic (moved here from
  `AdminNav`), extended with an `icon` per entry.
- Each link: an `aria-hidden` inline SVG icon + a text label. When collapsed,
  the label is **visually hidden (not removed)** so links stay queryable by
  accessible name and screen-reader-accessible; a `title` attribute gives a
  hover tooltip on the icon rail.
- `aria-current="page"` on the active link (unchanged semantics).
- Renders the collapse-toggle button (desktop only, chevron icon,
  `aria-expanded={!collapsed}`) and `LogoutButton` at the bottom.
- `LogoutButton` is reused unchanged.

### Icons

Five inline SVGs, one per link, authored in `AdminSidebar.tsx` (or a small
co-located `icons.tsx`), 24×24, `stroke="currentColor"`, `aria-hidden`,
`focusable="false"`. Simple line icons: Dashboard (grid), Projects (folder),
Posts (document), Tags (tag), Submissions (inbox/mail). The collapse chevron and
hamburger are two more inline SVGs.

## Behavior

**Desktop (≥768px):**
- Sidebar is a fixed left column: `~15rem` expanded, `~3.5rem` collapsed rail.
- Collapse toggle flips `collapsed`; width + `<main>` margin-left transition
  together. Labels fade/clip out in the rail, icons remain centered.
- State persists across reloads via `localStorage`.

**Mobile (<768px):**
- Sidebar is positioned off-canvas (`translateX(-100%)`); `<main>` has no left
  margin. The collapse toggle is hidden (rail makes no sense here).
- Hamburger in the mobile top bar sets `drawerOpen`, sliding the sidebar in over
  a backdrop. Closes on backdrop click, `Escape`, and route change.

**Motion:** width/transform/margin transitions are wrapped so
`@media (prefers-reduced-motion: reduce)` disables them.

## Styling

CSS Modules only (`AdminShell.module.css`, `AdminSidebar.module.css`), reusing
the neon tokens already in the admin:
- Surface `#12161f`, page bg `#0b0e14`, muted text `#aab2c0`, bright text
  `#f5f7fa`, turquoise accent `#00f0ff` for the active item (left border/indicator
  + text) and brand.
- Active link marked by `aria-current="page"` styling (turquoise indicator),
  matching the current nav's intent.
- Breakpoint: `768px` (consistent with `useDeviceTier`'s `lite` cutoff).
- The `(dashboard)/layout.tsx` `.content` container currently centers at
  `max-width: 64rem`. It stays, but now lives inside `<main>`; the outer
  margin-left is owned by the shell, inner centering by `.content`.

## Files

**New:** `AdminShell.tsx`, `AdminShell.module.css`, `AdminSidebar.tsx`,
`AdminSidebar.module.css`, `AdminSidebar.test.tsx` (and optional `icons.tsx`).

**Changed:** `(dashboard)/layout.tsx` renders `<AdminShell>{children}</AdminShell>`
instead of `<AdminNav/>` + `.content` wrapper (the `.content` centering moves
inside `<main>` within the shell).

**Removed:** `AdminNav.tsx`, `AdminNav.module.css`, `AdminNav.test.tsx` (logic
migrates into `AdminSidebar`).

## Testing

`AdminSidebar.test.tsx` (mocking `next/navigation` as the current test does):
- Renders all five links queryable by accessible name + a sign-out button
  (preserved from `AdminNav.test.tsx`).
- Marks the link matching the current path `aria-current="page"`.
- Treats `/admin` as current only on the exact dashboard path.
- Collapse toggle flips `aria-expanded` and the collapsed state attribute.

`AdminShell.test.tsx` (optional, light):
- Hamburger toggles `aria-expanded` / `data-drawer-open`.
- `Escape` closes an open drawer.

Note: jsdom has no layout, so the visual collapse/slide is verified by loading
the page, not by unit tests — the tests assert state wiring and a11y attributes
only.

## Risks / watch-items

- **Hydration:** read `localStorage` in an effect, never during render.
- **Accessibility:** collapsed labels must be visually hidden, not removed, so
  the nav stays usable by AT and testable by name.
- **Touch `:hover`:** no `:hover`-latched behavior drives layout (the rail is
  toggle-driven, not hover-driven), so the touch-latch trap that bit
  `ServicesSection` does not apply here.
