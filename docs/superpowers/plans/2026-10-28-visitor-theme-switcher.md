# Visitor Theme Switcher Implementation Plan (Phase 3, Spec A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor pick one of three curated themes from a header switcher and have it recolour the whole site and persist across pages/visits, without breaking the statically generated root layout.

**Architecture:** A new `is_public` flag + three seeded themes. The static root layout keeps rendering the admin's active theme and additionally embeds the public themes as JSON plus a blocking pre-hydration inline script that applies the visitor's saved theme before first paint. A client `ThemeSwitcher` in the header applies a chosen theme's CSS vars on `<html>` and remembers it in `localStorage`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Drizzle ORM + postgres-js, CSS Modules, Vitest + @testing-library/react.

## Global Constraints

- **Static generation is the top invariant.** Nothing added to `src/app/layout.tsx` or `src/app/(site)/layout.tsx` may read cookies, headers, or `searchParams`. The visitor's choice is applied client-side only. Verify `/` and `/contact` stay `○ (Static)` with `build:verify`.
- **The pre-hydration script must be a BLOCKING inline `<script>` placed before `{children}`** in the body — a deferred/async script would paint the default theme first.
- **The switcher must be hydration-safe:** render a deterministic initial highlight (the active theme) and reconcile to the stored id in an effect. NEVER read `localStorage` during render.
- **`isPublic` is editable through the form/validator** (via the existing `optBool`); **`isActive` is NOT** — `parseThemeInput` must still never read `isActive`.
- **The semantic relabel is labels-only.** DB columns (`turquoise/pink/purple/green`) and CSS vars (`--neon-*`) are unchanged — no migration, no var rename. Only the admin form/list labels change to `Primary/Secondary/Accent/Status`.
- **Status stays green in all three themes** (carries the "available for work" meaning site-wide).
- **Exact theme palettes** (the three-themes table) must be used verbatim in the seed.
- **Styling is CSS Modules, never Tailwind.**
- **The seed stays idempotent** — `onConflictDoUpdate`, never `onConflictDoNothing`.
- **Schema flow:** edit `schema.ts` → `npm run db:generate` → `npm run db:migrate`; COMMIT the generated `drizzle/*.sql`; never hand-edit it. New migration is `0008`.
- **Builds:** `npm run db:up` first; use `npm run build:verify` (never `npm run build` while a dev server runs). Run tests with `npx vitest run <file>`.
- **Cache tag:** `getPublicThemes` reuses the `"active-theme"` tag so existing theme mutations revalidate it — keep all theme mutations tagging `"active-theme"`.
- **Tests use `fireEvent`, never user-event.** `localStorage` is already polyfilled in `vitest.setup.ts`.
- There is a pre-existing unstaged change to `src/content/posts/base-api-service.md` and untracked content files — leave them untouched and unstaged.

### The three themes (verbatim)

| Role (column) | CyberPunk | Ember | Synthwave |
|---|---|---|---|
| `background` | `#0b0e14` | `#140b0a` | `#120a1e` |
| `foreground` | `#ffffff` | `#fff4ec` | `#f6f0ff` |
| `turquoise` | `#00f0ff` | `#ff7a18` | `#c05cff` |
| `pink` | `#ff2e97` | `#ff2e63` | `#ff5bd1` |
| `purple` | `#b026ff` | `#b5179e` | `#3ab0ff` |
| `green` | `#39ff88` | `#4ade80` | `#35e07f` |
| `heroPreset` | `orbit` | `pulse` | `wave` |
| `isActive` | `true` | `false` | `false` |
| `isPublic` | `true` | `true` | `true` |

---

### Task 1: `is_public` column, migration, type, validation, persistence

**Files:**
- Modify: `src/db/schema.ts` (the `themes` table)
- Create (generated): `drizzle/0008_*.sql`
- Modify: `src/services/types.ts` (`ThemeInput`, add `PublicTheme`)
- Modify: `src/lib/validateAdmin.ts` (`parseThemeInput`)
- Modify: `src/lib/validateAdmin.themes.test.ts` (isPublic cases)
- Modify: `src/db/content-write.ts` (`upsertTheme`)

**Interfaces:**
- Produces: `themes.isPublic` (column `is_public`, `boolean NOT NULL DEFAULT false`); `ThemeInput.isPublic?: boolean`; `PublicTheme` type; `parseThemeInput` resolves `isPublic` via `optBool(body.isPublic, false)`; `upsertTheme` persists it.

- [ ] **Step 1: Add the schema column**

In `src/db/schema.ts`, in the `themes` table, add `isPublic` immediately after `heroPreset`:

```ts
  heroPreset: text("hero_preset").notNull().default("orbit"),
  isPublic: boolean("is_public").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
```

- [ ] **Step 2: Generate and apply the migration**

Run (DB up — `npm run db:up` first if needed):
```bash
npm run db:generate
npm run db:migrate
```
Expected: a new `drizzle/0008_*.sql` with `ALTER TABLE "themes" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;`, applied cleanly. Do not edit the generated SQL.

- [ ] **Step 3: Add the types**

In `src/services/types.ts`, add `isPublic?: boolean` to `ThemeInput` (after `heroPreset`) and add the `PublicTheme` type below `ThemeRowDTO`:

```ts
export type ThemeInput = {
  name: string;
  background: string;
  foreground: string;
  turquoise: string;
  pink: string;
  purple: string;
  green: string;
  heroPreset?: string;
  isPublic?: boolean;
};
```
```ts
export type PublicTheme = {
  id: number;
  name: string;
  isActive: boolean;
  style: Record<string, string>;
};
```

- [ ] **Step 4: Write the failing validator tests**

In `src/lib/validateAdmin.themes.test.ts` (the dedicated theme-validator test, where `parseThemeInput` is already imported), add:

```ts
describe("parseThemeInput isPublic", () => {
  const base = {
    name: "Vapor",
    background: "#0b0e14", foreground: "#ffffff", turquoise: "#00f0ff",
    pink: "#ff2e97", purple: "#b026ff", green: "#39ff88",
  };

  it("accepts isPublic: true", () => {
    const r = parseThemeInput({ ...base, isPublic: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.isPublic).toBe(true);
  });

  it("defaults isPublic to false when absent", () => {
    const r = parseThemeInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.isPublic).toBe(false);
  });

  it("coerces a non-boolean isPublic to false", () => {
    const r = parseThemeInput({ ...base, isPublic: "yes" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.isPublic).toBe(false);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx vitest run src/lib/validateAdmin.themes.test.ts`
Expected: FAIL — `isPublic` is `undefined` in the parsed value.

- [ ] **Step 6: Implement the validation**

In `src/lib/validateAdmin.ts`, change the final return of `parseThemeInput` to resolve `isPublic` with the existing `optBool` helper:

```ts
  return { ok: true, value: { name, ...colors, heroPreset, isPublic: optBool(body.isPublic, false) } };
```

(`body` is already narrowed to an object; `optBool` is defined earlier in the file. No new import.)

- [ ] **Step 7: Persist in `upsertTheme`**

In `src/db/content-write.ts`, add `isPublic` to the `values` object in `upsertTheme`:

```ts
    heroPreset: input.heroPreset ?? "orbit",
    isPublic: input.isPublic ?? false,
  };
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/lib/validateAdmin.themes.test.ts`
Expected: PASS (existing cases + 3 new).

- [ ] **Step 9: Commit**

```bash
git add src/db/schema.ts drizzle/ src/services/types.ts src/lib/validateAdmin.ts src/lib/validateAdmin.themes.test.ts src/db/content-write.ts
git commit -m "Add is_public to themes: column, migration, validation, persistence"
```

---

### Task 2: Seed the three themes

**Files:**
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: the `is_public` column + `heroPreset` column.
- Produces: three themes (CyberPunk active+public, Ember public, Synthwave public) in a freshly seeded DB.

- [ ] **Step 1: Replace the single-theme seed with the three themes**

In `src/db/seed.ts`, replace the entire `await db.insert(themes)...` block (the Sunset block) with three idempotent upserts. Use the exact palettes from the Global Constraints table:

```ts
  const seedThemes = [
    { name: "CyberPunk", background: "#0b0e14", foreground: "#ffffff", turquoise: "#00f0ff",
      pink: "#ff2e97", purple: "#b026ff", green: "#39ff88", heroPreset: "orbit", isPublic: true, isActive: true },
    { name: "Ember", background: "#140b0a", foreground: "#fff4ec", turquoise: "#ff7a18",
      pink: "#ff2e63", purple: "#b5179e", green: "#4ade80", heroPreset: "pulse", isPublic: true, isActive: false },
    { name: "Synthwave", background: "#120a1e", foreground: "#f6f0ff", turquoise: "#c05cff",
      pink: "#ff5bd1", purple: "#3ab0ff", green: "#35e07f", heroPreset: "wave", isPublic: true, isActive: false },
  ];

  for (const t of seedThemes) {
    await db
      .insert(themes)
      .values(t)
      .onConflictDoUpdate({
        target: themes.name,
        set: {
          background: sql`excluded.background`,
          foreground: sql`excluded.foreground`,
          turquoise: sql`excluded.turquoise`,
          pink: sql`excluded.pink`,
          purple: sql`excluded.purple`,
          green: sql`excluded.green`,
          heroPreset: sql`excluded.hero_preset`,
          isPublic: sql`excluded.is_public`,
        },
      });
  }
```

Leave the two existing `projects`/`posts` seed blocks and the `console.log`/`seed().catch(...)` tail unchanged. (Note: `isActive` is deliberately NOT in the conflict `set`, so re-seeding never flips an admin's chosen active theme; a fresh DB gets CyberPunk active from the initial insert.)

- [ ] **Step 2: Verify idempotency against a live DB**

Run (DB up): `npm run db:seed && npm run db:seed`
Expected: both runs print "Dev bootstrap complete …" and exit 0; the second does not error or duplicate rows.

- [ ] **Step 3: Verify the rows**

Run: `docker compose exec -T db psql -U portfolio -d portfolio -c "select name, turquoise, hero_preset, is_public, is_active from themes order by id;"` (adjust service/user if your compose differs)
Expected: CyberPunk (`#00f0ff`, orbit, public, active), Ember (`#ff7a18`, pulse, public, inactive), Synthwave (`#c05cff`, wave, public, inactive). (If psql access differs locally, the double-seed success in Step 2 is the pass signal.)

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "Seed CyberPunk (active), Ember, and Synthwave themes"
```

---

### Task 3: `getPublicThemes` query + `toPublicTheme` mapper

**Files:**
- Modify: `src/db/queries.ts`
- Modify: `src/lib/themeStyle.ts`
- Modify: `src/lib/themeStyle.test.ts`

**Interfaces:**
- Consumes: `themes.isPublic` (Task 1), `PublicTheme` (Task 1), `themeToStyle` (existing).
- Produces: `getPublicThemes(): Promise<ThemeRow[]>` (cached, tag `"active-theme"`); `toPublicTheme(theme: ThemeRowDTO): PublicTheme`.

- [ ] **Step 1: Write the failing mapper test**

In `src/lib/themeStyle.test.ts`, add:

```ts
import { toPublicTheme } from "./themeStyle";

describe("toPublicTheme", () => {
  it("maps a theme row to a public DTO with a precomputed style map", () => {
    const result = toPublicTheme({
      id: 2, name: "Ember", isActive: false, heroPreset: "pulse",
      background: "#140b0a", foreground: "#fff4ec", turquoise: "#ff7a18",
      pink: "#ff2e63", purple: "#b5179e", green: "#4ade80",
    });
    expect(result).toEqual({
      id: 2,
      name: "Ember",
      isActive: false,
      style: {
        "--background": "#140b0a",
        "--foreground": "#fff4ec",
        "--neon-turquoise": "#ff7a18",
        "--neon-pink": "#ff2e63",
        "--neon-purple": "#b5179e",
        "--neon-green": "#4ade80",
        "--hero-preset": "pulse",
      },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/themeStyle.test.ts`
Expected: FAIL — `toPublicTheme` is not exported.

- [ ] **Step 3: Implement the mapper**

In `src/lib/themeStyle.ts`, update the import and add `toPublicTheme` below `themeToStyle`:

```ts
import type { ThemeRowDTO, PublicTheme } from "@/services/types";
```
```ts
export function toPublicTheme(theme: ThemeRowDTO): PublicTheme {
  return {
    id: theme.id,
    name: theme.name,
    isActive: theme.isActive,
    style: themeToStyle(theme),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/themeStyle.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the query**

In `src/db/queries.ts`, add after `getActiveTheme` (the imports already include `eq`, `asc`, `desc`, `unstable_cache`, `themes`):

```ts
// Public themes for the front-end switcher. Shares the "active-theme" cache tag
// so every theme mutation (which already revalidates it) busts this too.
export const getPublicThemes = unstable_cache(
  async (): Promise<ThemeRow[]> =>
    db
      .select()
      .from(themes)
      .where(eq(themes.isPublic, true))
      .orderBy(desc(themes.isActive), asc(themes.id)),
  ["public-themes"],
  { tags: ["active-theme"] },
);
```

- [ ] **Step 6: Type-check**

Run: `npm run build:verify` (DB up). Expected: builds cleanly (query + mapper type-check). (A full build here also confirms `/` is still static before the layout changes land.)

- [ ] **Step 7: Commit**

```bash
git add src/db/queries.ts src/lib/themeStyle.ts src/lib/themeStyle.test.ts
git commit -m "Add getPublicThemes query and toPublicTheme mapper"
```

---

### Task 4: Client theme-apply helpers

**Files:**
- Create: `src/lib/themeApply.ts`
- Create: `src/lib/themeApply.test.ts`

**Interfaces:**
- Produces: `THEME_STORAGE_KEY = "portfolio-theme"`; `applyThemeStyle(el: HTMLElement, style: Record<string,string>): void`; `storeThemeId(id: number): void`; `readStoredThemeId(): number | null`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/themeApply.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { THEME_STORAGE_KEY, applyThemeStyle, storeThemeId, readStoredThemeId } from "./themeApply";

beforeEach(() => {
  window.localStorage.clear();
});

describe("applyThemeStyle", () => {
  it("sets every custom property on the element", () => {
    const el = document.createElement("div");
    applyThemeStyle(el, { "--background": "#140b0a", "--neon-turquoise": "#ff7a18" });
    expect(el.style.getPropertyValue("--background")).toBe("#140b0a");
    expect(el.style.getPropertyValue("--neon-turquoise")).toBe("#ff7a18");
  });
});

describe("storeThemeId / readStoredThemeId", () => {
  it("round-trips a numeric id", () => {
    storeThemeId(3);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("3");
    expect(readStoredThemeId()).toBe(3);
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredThemeId()).toBeNull();
  });

  it("returns null for a non-numeric stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "abc");
    expect(readStoredThemeId()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/themeApply.test.ts`
Expected: FAIL — cannot resolve `./themeApply`.

- [ ] **Step 3: Implement**

Create `src/lib/themeApply.ts`:

```ts
// Shared client-side theme helpers for the front-end switcher. The pre-hydration
// inline script (themeBoot.ts) applies the saved theme before paint; these run
// at React runtime when a visitor switches.
export const THEME_STORAGE_KEY = "portfolio-theme";

export function applyThemeStyle(el: HTMLElement, style: Record<string, string>): void {
  for (const [prop, value] of Object.entries(style)) {
    el.style.setProperty(prop, value);
  }
}

export function storeThemeId(id: number): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, String(id));
  } catch {
    // storage unavailable (private mode / disabled) — non-fatal
  }
}

export function readStoredThemeId(): number | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/themeApply.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/themeApply.ts src/lib/themeApply.test.ts
git commit -m "Add client theme-apply helpers (apply vars, store/read choice)"
```

---

### Task 5: Pre-hydration boot script + wire into the root layout

**Files:**
- Create: `src/lib/themeBoot.ts`
- Create: `src/lib/themeBoot.test.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `THEME_STORAGE_KEY` (Task 4); `getPublicThemes` + `toPublicTheme` (Task 3).
- Produces: `buildThemeBootScript(storageKey?: string): string`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/themeBoot.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { buildThemeBootScript } from "./themeBoot";
import { THEME_STORAGE_KEY } from "./themeApply";

function runScript(src: string) {
  // The script is a self-invoking IIFE string; execute it against jsdom globals.
  new Function(src)();
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("style");
  document.body.innerHTML = `<script id="__themes__" type="application/json">${JSON.stringify([
    { id: 1, name: "CyberPunk", isActive: true, style: { "--background": "#0b0e14", "--neon-turquoise": "#00f0ff" } },
    { id: 2, name: "Ember", isActive: false, style: { "--background": "#140b0a", "--neon-turquoise": "#ff7a18" } },
  ])}</script>`;
});

describe("buildThemeBootScript", () => {
  it("applies the saved theme's vars before paint", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "2");
    runScript(buildThemeBootScript());
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("#140b0a");
    expect(document.documentElement.style.getPropertyValue("--neon-turquoise")).toBe("#ff7a18");
  });

  it("no-ops on an unknown saved id", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "999");
    runScript(buildThemeBootScript());
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("");
  });

  it("no-ops when nothing is stored", () => {
    runScript(buildThemeBootScript());
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/themeBoot.test.ts`
Expected: FAIL — cannot resolve `./themeBoot`.

- [ ] **Step 3: Implement the builder**

Create `src/lib/themeBoot.ts`:

```ts
import { THEME_STORAGE_KEY } from "./themeApply";

// Body of a blocking inline <script> that applies the visitor's saved public
// theme before first paint. Reads the embedded JSON (#__themes__) and sets each
// --* custom property on <html>. Self-contained (cannot import at runtime), so
// it duplicates the tiny var-setting loop. No-ops on an unknown/absent id.
export function buildThemeBootScript(storageKey: string = THEME_STORAGE_KEY): string {
  return `(function(){try{` +
    `var id=localStorage.getItem(${JSON.stringify(storageKey)});if(!id)return;` +
    `var el=document.getElementById('__themes__');if(!el)return;` +
    `var themes=JSON.parse(el.textContent||'[]');` +
    `var t=themes.find(function(x){return String(x.id)===String(id);});` +
    `if(!t||!t.style)return;var root=document.documentElement;` +
    `Object.keys(t.style).forEach(function(k){root.style.setProperty(k,t.style[k]);});` +
    `}catch(e){}})();`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/themeBoot.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire into the root layout**

In `src/app/layout.tsx`: update the query import, add the themeBoot import and `toPublicTheme`, read both themes in parallel, and emit the JSON + boot script at the start of `<body>`.

Change the imports:
```ts
import { getActiveTheme, getPublicThemes } from "@/db/queries";
import { themeToStyle, toPublicTheme } from "@/lib/themeStyle";
import { buildThemeBootScript } from "@/lib/themeBoot";
```

Replace the `const activeTheme = await getActiveTheme();` line with:
```ts
  const [activeTheme, publicRows] = await Promise.all([getActiveTheme(), getPublicThemes()]);
  const publicThemes = publicRows.map(toPublicTheme);
```

Replace the `<body>` opening so the two scripts are the first children:
```tsx
      <body>
        <script
          id="__themes__"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(publicThemes) }}
        />
        <script dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }} />
        {children}
        <ToastContainer theme="dark" position="bottom-right" />
        <Analytics />
        <SpeedInsights />
      </body>
```

- [ ] **Step 6: Verify static generation survives**

Run (DB up): `npm run build:verify`
Expected: build succeeds; `/` and `/contact` are `○ (Static)`, blog/projects SSG. If `/` went Dynamic, the layout accidentally read a dynamic input — stop and fix before committing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/themeBoot.ts src/lib/themeBoot.test.ts src/app/layout.tsx
git commit -m "Embed public themes and apply the saved theme pre-hydration"
```

---

### Task 6: ThemeSwitcher component + Header / site-layout wiring

**Files:**
- Create: `src/components/theme/ThemeSwitcher.tsx`
- Create: `src/components/theme/ThemeSwitcher.module.css`
- Create: `src/components/theme/ThemeSwitcher.test.tsx`
- Modify: `src/components/header/Header.tsx`
- Modify: `src/app/(site)/layout.tsx`

**Interfaces:**
- Consumes: `PublicTheme` (Task 1); `applyThemeStyle`, `storeThemeId`, `readStoredThemeId` (Task 4); `getPublicThemes` + `toPublicTheme` (Task 3).
- Produces: `<ThemeSwitcher themes={PublicTheme[]} />`; `Header` gains a required `publicThemes: PublicTheme[]` prop.

- [ ] **Step 1: Write the failing test**

Create `src/components/theme/ThemeSwitcher.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apply: vi.fn(), store: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/themeApply", () => ({
  THEME_STORAGE_KEY: "portfolio-theme",
  applyThemeStyle: mocks.apply,
  storeThemeId: mocks.store,
  readStoredThemeId: mocks.read,
}));

import { ThemeSwitcher } from "./ThemeSwitcher";
import type { PublicTheme } from "@/services/types";

const themes: PublicTheme[] = [
  { id: 1, name: "CyberPunk", isActive: true, style: { "--neon-turquoise": "#00f0ff" } },
  { id: 2, name: "Ember", isActive: false, style: { "--neon-turquoise": "#ff7a18" } },
  { id: 3, name: "Synthwave", isActive: false, style: { "--neon-turquoise": "#c05cff" } },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockReturnValue(null);
});

describe("ThemeSwitcher", () => {
  it("renders nothing when there are no public themes", () => {
    const { container } = render(<ThemeSwitcher themes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens the menu and lists every public theme", () => {
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    expect(screen.getByRole("option", { name: /cyberpunk/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ember/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /synthwave/i })).toBeInTheDocument();
  });

  it("applies vars and stores the id when a theme is picked", () => {
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    fireEvent.click(screen.getByRole("option", { name: /ember/i }));
    expect(mocks.apply).toHaveBeenCalledWith(document.documentElement, themes[1].style);
    expect(mocks.store).toHaveBeenCalledWith(2);
  });

  it("highlights the active theme initially", () => {
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    expect(screen.getByRole("option", { name: /cyberpunk/i })).toHaveAttribute("aria-selected", "true");
  });

  it("reconciles the highlight to a stored id after mount", async () => {
    mocks.read.mockReturnValue(3);
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /synthwave/i })).toHaveAttribute("aria-selected", "true"),
    );
  });

  it("falls back to active when the stored id is not a public theme", () => {
    mocks.read.mockReturnValue(999);
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    expect(screen.getByRole("option", { name: /cyberpunk/i })).toHaveAttribute("aria-selected", "true");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/theme/ThemeSwitcher.test.tsx`
Expected: FAIL — cannot resolve `./ThemeSwitcher`.

- [ ] **Step 3: Implement the component**

Create `src/components/theme/ThemeSwitcher.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicTheme } from "@/services/types";
import { applyThemeStyle, storeThemeId, readStoredThemeId } from "@/lib/themeApply";
import styles from "./ThemeSwitcher.module.css";

export function ThemeSwitcher({ themes }: { themes: PublicTheme[] }) {
  const defaultId = (themes.find((t) => t.isActive) ?? themes[0])?.id ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(defaultId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Reconcile to the stored choice after mount — never read storage during render.
  useEffect(() => {
    const stored = readStoredThemeId();
    if (stored !== null && themes.some((t) => t.id === stored)) {
      setSelectedId(stored);
    }
  }, [themes]);

  // Close on outside click while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (themes.length === 0) return null;

  function pick(theme: PublicTheme) {
    applyThemeStyle(document.documentElement, theme.style);
    storeThemeId(theme.id);
    setSelectedId(theme.id);
    setOpen(false);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change theme"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="8.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <ul className={styles.menu} role="listbox" aria-label="Theme">
          {themes.map((theme) => (
            <li key={theme.id}>
              <button
                type="button"
                role="option"
                aria-selected={theme.id === selectedId}
                className={styles.option}
                onClick={() => pick(theme)}
              >
                <span className={styles.swatches} aria-hidden="true">
                  <span style={{ background: theme.style["--neon-turquoise"] }} />
                  <span style={{ background: theme.style["--neon-pink"] }} />
                  <span style={{ background: theme.style["--neon-purple"] }} />
                </span>
                <span className={styles.name}>{theme.name}</span>
                {theme.id === selectedId && <span className={styles.check} aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the CSS module**

Create `src/components/theme/ThemeSwitcher.module.css`:

```css
.root {
  position: relative;
  display: inline-flex;
}

.trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
}

.trigger:hover {
  border-color: var(--neon-turquoise);
  color: var(--neon-turquoise);
}

.menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 50;
  min-width: 11rem;
  margin: 0;
  padding: 0.35rem;
  list-style: none;
  background: var(--card, #12161f);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.6rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}

.option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--foreground);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.option:hover,
.option[aria-selected="true"] {
  background: rgba(0, 240, 255, 0.1);
}

.swatches {
  display: inline-flex;
  gap: 2px;
}

.swatches span {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.name {
  flex: 1;
}

.check {
  color: var(--neon-turquoise);
}
```

- [ ] **Step 5: Run to verify the component tests pass**

Run: `npx vitest run src/components/theme/ThemeSwitcher.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 6: Wire into the Header**

In `src/components/header/Header.tsx`: add the imports, the prop, and render the switcher first in the `.actions` div.

Imports (after the existing ones):
```ts
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import type { PublicTheme } from "@/services/types";
```

Signature:
```ts
export function Header({ publicThemes }: { publicThemes: PublicTheme[] }) {
```

Inside `<div className={styles.actions}>`, make the switcher the first child (immediately before the `<a className={styles.resume} ...>`):
```tsx
        <div className={styles.actions}>
          <ThemeSwitcher themes={publicThemes} />
          <a className={styles.resume} href={RESUME_URL} download>
```

- [ ] **Step 7: Wire the site layout to pass public themes**

Replace `src/app/(site)/layout.tsx` with:

```tsx
import React from "react";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import { getPublicThemes } from "@/db/queries";
import { toPublicTheme } from "@/lib/themeStyle";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const publicThemes = (await getPublicThemes()).map(toPublicTheme);
  return (
    <>
      <Header publicThemes={publicThemes} />
      {children}
      <Footer />
    </>
  );
}
```

- [ ] **Step 8: Verify build + static generation**

Run (DB up): `npm run build:verify`
Expected: build succeeds; `/` and `/contact` remain `○ (Static)`. (The `(site)` layout reads only the cached `getPublicThemes`, so static generation holds.)

- [ ] **Step 9: Commit**

```bash
git add src/components/theme/ src/components/header/Header.tsx "src/app/(site)/layout.tsx"
git commit -m "Add front-end ThemeSwitcher wired through the header"
```

---

### Task 7: Admin surface — semantic labels, "Show on site" toggle, Public column

**Files:**
- Modify: `src/app/admin/(dashboard)/ThemeForm.tsx`
- Modify: `src/app/admin/(dashboard)/ThemeForm.test.tsx`
- Modify: `src/app/admin/(dashboard)/themes/page.tsx`
- Modify: `src/app/admin/(dashboard)/themes/page.test.tsx`

**Interfaces:**
- Consumes: `ThemeInput.isPublic` (Task 1).
- Produces: the form submits `isPublic`; the list shows a Public column.

- [ ] **Step 1: Update the ThemeForm tests (labels + isPublic)**

In `src/app/admin/(dashboard)/ThemeForm.test.tsx`:

Change the slot-label loop (line ~9) to the new semantic labels:
```ts
    for (const slot of ["Background", "Foreground", "Primary", "Secondary", "Accent", "Status"]) {
      expect(screen.getByLabelText(slot)).toBeInTheDocument();
    }
```

Add two cases inside the `describe("ThemeForm", ...)` block:
```ts
  it("submits isPublic false by default", () => {
    const onSubmit = vi.fn();
    render(<ThemeForm submitLabel="Create theme" onSubmit={onSubmit} submitting={false} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Vapor" } });
    fireEvent.submit(screen.getByRole("button", { name: /create theme/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isPublic: false }));
  });

  it("submits isPublic true when 'Show on site' is checked", () => {
    const onSubmit = vi.fn();
    render(<ThemeForm submitLabel="Create theme" onSubmit={onSubmit} submitting={false} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Vapor" } });
    fireEvent.click(screen.getByLabelText(/show on site/i));
    fireEvent.submit(screen.getByRole("button", { name: /create theme/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }));
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run "src/app/admin/(dashboard)/ThemeForm.test.tsx"`
Expected: FAIL — the semantic labels don't exist yet; `isPublic` not in payload; no "Show on site" control.

- [ ] **Step 3: Relabel the slots and add the "Show on site" toggle**

In `src/app/admin/(dashboard)/ThemeForm.tsx`, change the four accent `label`s in `SLOTS` (keys unchanged):
```ts
const SLOTS: { key: keyof Omit<ThemeInput, "name">; label: string; fallback: string }[] = [
  { key: "background", label: "Background", fallback: "#0b0e14" },
  { key: "foreground", label: "Foreground", fallback: "#ffffff" },
  { key: "turquoise", label: "Primary", fallback: "#00f0ff" },
  { key: "pink", label: "Secondary", fallback: "#ff2e97" },
  { key: "purple", label: "Accent", fallback: "#b026ff" },
  { key: "green", label: "Status", fallback: "#39ff88" },
];
```

Add `isPublic` state (after the `heroPreset` state):
```ts
  const [isPublic, setIsPublic] = useState<boolean>(initial?.isPublic ?? false);
```

Include it in the `onSubmit` payload (after `heroPreset`):
```ts
      heroPreset,
      isPublic,
    });
```

Add the checkbox after the hero-animation `<fieldset>` and before `<div className={styles.actions}>`:
```tsx
      <label className={fieldStyles.field}>
        <span className={fieldStyles.label}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />{" "}
          Show on site
        </span>
      </label>
```

- [ ] **Step 4: Run to verify the form tests pass**

Run: `npx vitest run "src/app/admin/(dashboard)/ThemeForm.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Write the failing list test**

In `src/app/admin/(dashboard)/themes/page.test.tsx`, add `isPublic` to both fixtures (line ~17/19):
```ts
  { id: 1, name: "Default Neon", isActive: true, isPublic: true, heroPreset: "orbit", background: "#0b0e14", foreground: "#ffffff",
    turquoise: "#00f0ff", pink: "#ff2e97", purple: "#b026ff", green: "#39ff88" },
  { id: 2, name: "Sunset", isActive: false, isPublic: false, heroPreset: "pulse", background: "#101010", foreground: "#fafafa",
    turquoise: "#11ccdd", pink: "#ee3388", purple: "#9922ee", green: "#22dd77" },
```
Add a test:
```ts
  it("shows whether each theme is public", async () => {
    render(<ThemesListPage />);
    await waitFor(() => expect(screen.getByText("Default Neon")).toBeInTheDocument());
    const rows = screen.getAllByRole("row");
    // header + 2 data rows
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/themes/page.test.tsx"`
Expected: FAIL — no "Yes"/"No" public cell.

- [ ] **Step 7: Add the Public column**

In `src/app/admin/(dashboard)/themes/page.tsx`, add a column to the `columns` array after the `heroPreset` (Animation) column and before `active`:
```ts
      {
        key: "isPublic",
        header: "Public",
        sort: (t) => (t.isPublic ? 1 : 0),
        cell: (t) => (t.isPublic ? "Yes" : "No"),
      },
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/themes/page.test.tsx"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(dashboard)/ThemeForm.tsx" "src/app/admin/(dashboard)/ThemeForm.test.tsx" "src/app/admin/(dashboard)/themes/page.tsx" "src/app/admin/(dashboard)/themes/page.test.tsx"
git commit -m "Admin: semantic slot labels, Show-on-site toggle, Public column"
```

---

## Final verification (after all tasks)

- [ ] Full suite: `npx vitest run` — all green (prior count + new themeApply, themeBoot, toPublicTheme, validator isPublic, ThemeSwitcher, admin cases).
- [ ] `npm run lint` — clean.
- [ ] `npm run build:verify` (DB up) — succeeds; `/` and `/contact` `○ (Static)`, blog/projects SSG.
- [ ] Manual (jsdom has no paint/WebGL): `npm run db:seed`; load `/`, scroll past the hero so the header reveals, open the theme switcher, pick Ember/Synthwave → whole site recolours and persists on reload and across pages; in `/admin/themes` confirm the semantic labels, the "Show on site" toggle, and the Public column; toggling a theme private removes it from the front-end switcher after revalidation.
