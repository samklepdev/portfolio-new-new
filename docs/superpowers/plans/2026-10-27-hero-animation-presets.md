# Hero Animation Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin theme choose the hero's animation style (orbit / drift / pulse / wave), delivered through the same active-theme `<html>`-custom-property pipeline Phase 1 built for colour.

**Architecture:** A new `hero_preset` column on `themes` rides the existing active-theme read into `<html style>` as a `--hero-preset` custom property. The hero reads it once at field init and maps it to one of four pure motion functions; everything else about the hero (geometry, colours, bloom, device tiers, scroll choreography) is untouched. The preset is validated against a closed set on write and falls back to `orbit` anywhere it is missing or unknown.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Drizzle ORM + postgres-js, `@react-three/fiber@9` + `three`, Vitest + @testing-library/react, CSS Modules.

## Global Constraints

- **The four presets are exactly `orbit`, `drift`, `pulse`, `wave`.** `orbit` is the default and MUST reproduce today's hero bit-for-bit: ambient `rotation.y += delta * 0.03`, ambient scale `1`.
- **Scroll choreography is identical for every preset:** `scale = ambientScale * (1 + progress * 2.2)`, `opacity = max(0, 1 - progress * 1.4)`, camera `z = 10 - progress * 2`. Presets vary ONLY the at-rest ambient motion.
- **Device-tier budgets are unchanged:** 2500 particles on `full` / 800 otherwise, bloom on `full` only, DPR capped at `min(2, devicePixelRatio)`. A preset is motion only; it never reads or alters `useDeviceTier`.
- **Read the `--hero-preset` CSS var once at field init (inside the existing `useMemo`), never per-frame** — a per-frame `getComputedStyle` violates the hero's imperative-read rule and wrecks performance.
- **No active theme → no `--hero-preset` → `orbit`.** Unknown/empty value → `orbit`. The fallback must be visually indistinguishable from today's site.
- **Styling is CSS Modules, never Tailwind.** Neon palette lives in `globals.css` `:root`: `--background #0b0e14`, `--foreground #ffffff`, `--neon-turquoise #00f0ff`, `--neon-pink #ff2e97`, `--neon-purple #b026ff`, `--neon-green #39ff88`.
- **Schema flow:** edit `schema.ts` → `npm run db:generate` → `npm run db:migrate`. COMMIT the generated `drizzle/*.sql`. Never hand-edit a migration, never write DDL directly.
- **The seed stays idempotent** — `onConflictDoUpdate`, never `onConflictDoNothing`.
- **Builds:** `npm run db:up` must be running; use `npm run build:verify` (writes to `.next-verify`), NEVER `npm run build` while `next dev` is running. Run unit tests with `npx vitest run <file>`.
- **`heroPreset` is optional on the `ThemeInput`/`ThemeRowDTO` wire types (`heroPreset?: string`)** so each task compiles independently; the DB column is `NOT NULL DEFAULT 'orbit'`, so persisted rows always carry a value, and readers guard with `?? "orbit"`.

---

### Task 1: Schema column, migration, and shared preset constant

**Files:**
- Create: `src/lib/heroPresets.ts`
- Create: `src/lib/heroPresets.test.ts`
- Modify: `src/db/schema.ts` (the `themes` table)
- Create (generated): `drizzle/0007_*.sql`

**Interfaces:**
- Produces: `HERO_PRESETS: readonly ["orbit","drift","pulse","wave"]`, `type HeroPreset`, `DEFAULT_HERO_PRESET: HeroPreset = "orbit"`, `HERO_PRESET_LABELS: Record<HeroPreset,string>`. The `themes` table gains `heroPreset` (column `hero_preset`, `text NOT NULL DEFAULT 'orbit'`), so `ThemeRow` (drizzle-inferred) carries `heroPreset: string`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/heroPresets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HERO_PRESETS, DEFAULT_HERO_PRESET, HERO_PRESET_LABELS } from "./heroPresets";

describe("heroPresets", () => {
  it("lists exactly the four presets with orbit first", () => {
    expect(HERO_PRESETS).toEqual(["orbit", "drift", "pulse", "wave"]);
  });

  it("defaults to orbit", () => {
    expect(DEFAULT_HERO_PRESET).toBe("orbit");
    expect(HERO_PRESETS).toContain(DEFAULT_HERO_PRESET);
  });

  it("has a human label for every preset", () => {
    for (const preset of HERO_PRESETS) {
      expect(HERO_PRESET_LABELS[preset]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/heroPresets.test.ts`
Expected: FAIL — cannot resolve `./heroPresets`.

- [ ] **Step 3: Create the shared constant**

Create `src/lib/heroPresets.ts`:

```ts
// The hero's animation styles. Single source of truth for the valid set,
// shared by the theme validator, the admin form, and the hero motion resolver.
export const HERO_PRESETS = ["orbit", "drift", "pulse", "wave"] as const;

export type HeroPreset = (typeof HERO_PRESETS)[number];

export const DEFAULT_HERO_PRESET: HeroPreset = "orbit";

export const HERO_PRESET_LABELS: Record<HeroPreset, string> = {
  orbit: "Orbit — a slow, steady rotation (the classic look)",
  drift: "Drift — a calm wander with a gentle bob",
  pulse: "Pulse — the field breathes in and out",
  wave: "Wave — a travelling ripple across the particles",
};

export function isHeroPreset(value: unknown): value is HeroPreset {
  return typeof value === "string" && (HERO_PRESETS as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/heroPresets.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the schema column**

In `src/db/schema.ts`, inside the `themes` table definition, add the `heroPreset` column immediately after the `green` column:

```ts
  green: text("green").notNull().default("#39ff88"),
  heroPreset: text("hero_preset").notNull().default("orbit"),
  isActive: boolean("is_active").notNull().default(false),
```

- [ ] **Step 6: Generate and apply the migration**

Run (DB must be up — `npm run db:up` first if needed):
```bash
npm run db:generate
npm run db:migrate
```
Expected: a new file `drizzle/0007_*.sql` containing `ALTER TABLE "themes" ADD COLUMN "hero_preset" text DEFAULT 'orbit' NOT NULL;`, and `db:migrate` reports it applied. Do not edit the generated SQL.

- [ ] **Step 7: Commit**

```bash
git add src/lib/heroPresets.ts src/lib/heroPresets.test.ts src/db/schema.ts drizzle/
git commit -m "Add hero_preset column, migration, and shared preset constant"
```

---

### Task 2: Validate and persist the preset

**Files:**
- Modify: `src/services/types.ts` (the `ThemeInput` type)
- Modify: `src/lib/validateAdmin.ts` (`parseThemeInput`)
- Modify: `src/lib/validateAdmin.test.ts` (add a `parseThemeInput` describe block)
- Modify: `src/db/content-write.ts` (`upsertTheme`)
- Modify: `src/db/seed.ts` (the Sunset theme)

**Interfaces:**
- Consumes: `HERO_PRESETS`, `DEFAULT_HERO_PRESET`, `isHeroPreset` from `@/lib/heroPresets` (Task 1); the `hero_preset` column (Task 1).
- Produces: `ThemeInput.heroPreset?: string` (so `ThemeRowDTO` inherits it). `parseThemeInput` now returns a `value` whose `heroPreset` is always a concrete valid preset string. `upsertTheme` persists `heroPreset`.

- [ ] **Step 1: Add the optional field to the wire type**

In `src/services/types.ts`, add to `ThemeInput` (after `green`):

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
};
```

(`ThemeRowDTO = ThemeInput & { id; isActive }` inherits the field automatically.)

- [ ] **Step 2: Write the failing validator tests**

In `src/lib/validateAdmin.test.ts`, first add `parseThemeInput` to the EXISTING import (do not add a second `import` from `./validateAdmin` — `no-duplicate-imports` would flag it):

```ts
import { parseId, parseProjectInput, parsePostInput, parseTagInput, parseThemeInput } from "./validateAdmin";
```

Then add this describe block at the end of the file:

```ts
describe("parseThemeInput", () => {
  const base = {
    name: "Vapor",
    background: "#0b0e14",
    foreground: "#ffffff",
    turquoise: "#00f0ff",
    pink: "#ff2e97",
    purple: "#b026ff",
    green: "#39ff88",
  };

  it("accepts and echoes a valid hero preset", () => {
    const result = parseThemeInput({ ...base, heroPreset: "pulse" });
    expect(result).toEqual({ ok: true, value: expect.objectContaining({ heroPreset: "pulse" }) });
  });

  it("defaults heroPreset to orbit when absent", () => {
    const result = parseThemeInput(base);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.heroPreset).toBe("orbit");
  });

  it("rejects an unknown hero preset", () => {
    const result = parseThemeInput({ ...base, heroPreset: "spin" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/hero preset/i);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/validateAdmin.test.ts`
Expected: FAIL — `heroPreset` is `undefined` in the output (default not applied) and the unknown value is not rejected.

- [ ] **Step 4: Implement the validation**

In `src/lib/validateAdmin.ts`, add the import near the top:

```ts
import { HERO_PRESETS, DEFAULT_HERO_PRESET, isHeroPreset } from "@/lib/heroPresets";
```

Then change the end of `parseThemeInput` (the `return { ok: true, value: { name, ...colors } };` line) to resolve the preset first:

```ts
  const rawPreset = (body as Record<string, unknown>).heroPreset;
  let heroPreset: string = DEFAULT_HERO_PRESET;
  if (rawPreset !== undefined) {
    if (!isHeroPreset(rawPreset)) {
      return { ok: false, error: `Invalid hero preset: "${String(rawPreset)}" (expected one of ${HERO_PRESETS.join(", ")})` };
    }
    heroPreset = rawPreset;
  }

  return { ok: true, value: { name, ...colors, heroPreset } };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/validateAdmin.test.ts`
Expected: PASS (all existing cases plus the three new ones).

- [ ] **Step 6: Persist the preset in `upsertTheme`**

In `src/db/content-write.ts`, in `upsertTheme`, add `heroPreset` to the `values` object (defaulting defensively in case a caller passes a bare `ThemeInput`):

```ts
  const values = {
    name: input.name,
    background: input.background,
    foreground: input.foreground,
    turquoise: input.turquoise,
    pink: input.pink,
    purple: input.purple,
    green: input.green,
    heroPreset: input.heroPreset ?? "orbit",
  };
```

(The existing update path already spreads `...values`, so this flows into both insert and update.)

- [ ] **Step 7: Give the seed's Sunset theme a non-default preset**

In `src/db/seed.ts`, in the `themes` insert `.values({...})`, add `heroPreset: "pulse"` after `green`, and add the column to the conflict `set`:

```ts
      green: "#39ff88",
      heroPreset: "pulse",
      isActive: false,
    })
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
      },
    });
```

- [ ] **Step 8: Verify the seed runs idempotently**

Run (DB up): `npm run db:seed && npm run db:seed`
Expected: both runs succeed; the second does not error (the Sunset row is updated, not duplicated).

- [ ] **Step 9: Commit**

```bash
git add src/services/types.ts src/lib/validateAdmin.ts src/lib/validateAdmin.test.ts src/db/content-write.ts src/db/seed.ts
git commit -m "Validate and persist the hero preset on themes"
```

---

### Task 3: Deliver the preset as a CSS custom property (`themeToStyle`)

**Files:**
- Modify: `src/lib/themeStyle.ts` (rename `paletteToStyle` → `themeToStyle`, add the var)
- Modify: `src/lib/themeStyle.test.ts` (rename + assert the new var)
- Modify: `src/app/layout.tsx` (import + call site)

**Interfaces:**
- Consumes: `ThemeRowDTO.heroPreset` (Task 2).
- Produces: `themeToStyle(theme: ThemeRowDTO | null): Record<string,string>` — `{}` for null; otherwise the six colour vars plus `"--hero-preset": theme.heroPreset ?? "orbit"`. Replaces the old `paletteToStyle`.

- [ ] **Step 1: Update the test to the new name and assert the var**

Replace the whole body of `src/lib/themeStyle.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { themeToStyle } from "./themeStyle";
import type { ThemeRowDTO } from "@/services/types";

const theme: ThemeRowDTO = {
  id: 1,
  name: "Sunset",
  background: "#101010",
  foreground: "#fafafa",
  turquoise: "#11ccdd",
  pink: "#ee3388",
  purple: "#9922ee",
  green: "#22dd77",
  heroPreset: "pulse",
  isActive: true,
};

describe("themeToStyle", () => {
  it("returns an empty object for the default (null) theme", () => {
    expect(themeToStyle(null)).toEqual({});
  });

  it("maps a theme to the six :root custom properties plus the hero preset", () => {
    expect(themeToStyle(theme)).toEqual({
      "--background": "#101010",
      "--foreground": "#fafafa",
      "--neon-turquoise": "#11ccdd",
      "--neon-pink": "#ee3388",
      "--neon-purple": "#9922ee",
      "--neon-green": "#22dd77",
      "--hero-preset": "pulse",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/themeStyle.test.ts`
Expected: FAIL — `themeToStyle` is not exported.

- [ ] **Step 3: Rename the function and add the var**

In `src/lib/themeStyle.ts`, rename the export and add the preset key:

```ts
export function themeToStyle(theme: ThemeRowDTO | null): Record<string, string> {
  if (!theme) return {};
  return {
    "--background": theme.background,
    "--foreground": theme.foreground,
    "--neon-turquoise": theme.turquoise,
    "--neon-pink": theme.pink,
    "--neon-purple": theme.purple,
    "--neon-green": theme.green,
    "--hero-preset": theme.heroPreset ?? "orbit",
  };
}
```

- [ ] **Step 4: Update the layout call site**

In `src/app/layout.tsx`, change the import (line ~11) and the call (line ~47):

```ts
import { themeToStyle } from "@/lib/themeStyle";
```
```tsx
      style={themeToStyle(activeTheme) as React.CSSProperties}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/themeStyle.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Verify nothing else references the old name**

Run: `grep -rn "paletteToStyle" src`
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add src/lib/themeStyle.ts src/lib/themeStyle.test.ts src/app/layout.tsx
git commit -m "Rename paletteToStyle to themeToStyle and emit --hero-preset"
```

---

### Task 4: Hero motion resolver and `HeroScene` refactor

**Files:**
- Create: `src/components/hero/heroMotion.ts`
- Create: `src/components/hero/heroMotion.test.ts`
- Modify: `src/components/hero/HeroScene.tsx`

**Interfaces:**
- Consumes: `HeroPreset` from `@/lib/heroPresets` (Task 1); the `--hero-preset` CSS var (Task 3).
- Produces: `type MotionCtx = { elapsed: number; delta: number; basePositions: Float32Array }`; `type HeroMotion = (points: THREE.Points, ctx: MotionCtx) => number` (returns the ambient scale); `resolveHeroMotion(name: string): HeroMotion` (falls back to the orbit motion on empty/unknown).

- [ ] **Step 1: Write the failing test**

Create `src/components/hero/heroMotion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { resolveHeroMotion } from "./heroMotion";

// A minimal Points-like stub for the transform-only presets.
const stubPoints = () => ({ rotation: { x: 0, y: 0 } }) as unknown as THREE.Points;
const ctx = (elapsed: number) => ({ elapsed, delta: 0.016, basePositions: new Float32Array() });

describe("resolveHeroMotion", () => {
  it("returns a distinct motion for each preset", () => {
    const orbit = resolveHeroMotion("orbit");
    const drift = resolveHeroMotion("drift");
    const pulse = resolveHeroMotion("pulse");
    const wave = resolveHeroMotion("wave");
    expect(new Set([orbit, drift, pulse, wave]).size).toBe(4);
  });

  it("falls back to the orbit motion for empty or unknown names", () => {
    const orbit = resolveHeroMotion("orbit");
    expect(resolveHeroMotion("")).toBe(orbit);
    expect(resolveHeroMotion("nope")).toBe(orbit);
  });

  it("orbit holds ambient scale at 1, pulse breathes away from 1", () => {
    expect(resolveHeroMotion("orbit")(stubPoints(), ctx(0))).toBe(1);
    // elapsed chosen so sin(elapsed * 0.8) === 1
    const peak = Math.PI / 2 / 0.8;
    expect(resolveHeroMotion("pulse")(stubPoints(), ctx(peak))).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/hero/heroMotion.test.ts`
Expected: FAIL — cannot resolve `./heroMotion`.

- [ ] **Step 3: Implement the motion module**

Create `src/components/hero/heroMotion.ts`:

```ts
import * as THREE from "three";
import type { HeroPreset } from "@/lib/heroPresets";

export type MotionCtx = {
  elapsed: number;
  delta: number;
  basePositions: Float32Array;
};

// Mutates the points' rotation (and, for wave, its geometry positions) for the
// current frame and returns the ambient scale multiplier (1 unless breathing).
export type HeroMotion = (points: THREE.Points, ctx: MotionCtx) => number;

const orbit: HeroMotion = (points, { delta }) => {
  points.rotation.y += delta * 0.03;
  return 1;
};

const drift: HeroMotion = (points, { delta, elapsed }) => {
  points.rotation.y += delta * 0.01;
  points.rotation.x = Math.sin(elapsed * 0.15) * 0.12;
  return 1;
};

const pulse: HeroMotion = (points, { delta, elapsed }) => {
  points.rotation.y += delta * 0.02;
  return 1 + Math.sin(elapsed * 0.8) * 0.06;
};

const wave: HeroMotion = (points, { delta, elapsed, basePositions }) => {
  points.rotation.y += delta * 0.015;
  const attr = (points.geometry as THREE.BufferGeometry).attributes
    .position as THREE.BufferAttribute;
  const array = attr.array as Float32Array;
  // Displace Z from the pristine base so the ripple never accumulates.
  for (let i = 0; i < array.length; i += 3) {
    array[i + 2] = basePositions[i + 2] + Math.sin(basePositions[i] * 0.6 + elapsed * 1.2) * 0.25;
  }
  attr.needsUpdate = true;
  return 1;
};

const MOTIONS: Record<HeroPreset, HeroMotion> = { orbit, drift, pulse, wave };

export function resolveHeroMotion(name: string): HeroMotion {
  return MOTIONS[name as HeroPreset] ?? orbit;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/hero/heroMotion.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor `HeroScene.tsx` to use the resolver**

Replace the entire contents of `src/components/hero/HeroScene.tsx` with:

```tsx
"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { useScrollStore } from "@/lib/scrollStore";
import type { DeviceTier } from "@/lib/useDeviceTier";
import { resolveHeroMotion } from "./heroMotion";

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function ParticleField({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, basePositions, motion } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color(readVar("--neon-turquoise", "#00F0FF")),
      new THREE.Color(readVar("--neon-pink", "#FF2E97")),
      new THREE.Color(readVar("--neon-purple", "#B026FF")),
    ];

    for (let i = 0; i < count; i++) {
      const radius = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // turquoise dominant, pink/purple as sparse accents
      const color = Math.random() < 0.75 ? palette[0] : palette[Math.random() < 0.5 ? 1 : 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    // Pristine copy so the wave preset can displace from a stable origin.
    const basePositions = positions.slice();
    // Read the active theme's motion once, here — never per frame.
    const motion = resolveHeroMotion(readVar("--hero-preset", "orbit"));

    return { positions, colors, basePositions, motion };
  }, [count]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    // preset-specific ambient motion (orbit/drift/pulse/wave)
    const ambientScale = motion(points, {
      elapsed: state.clock.elapsedTime,
      delta,
      basePositions,
    });

    // scroll-driven: field disperses outward and fades as progress -> 1
    const progress = useScrollStore.getState().progress;
    points.scale.setScalar(ambientScale * (1 + progress * 2.2));

    const material = points.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, 1 - progress * 1.4);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function CameraRig() {
  useFrame(({ camera }) => {
    const progress = useScrollStore.getState().progress;
    // subtle push-in as user scrolls, sells the "receding into depth" feel
    camera.position.z = 10 - progress * 2;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function HeroScene({ tier }: { tier: DeviceTier }) {
  const particleCount = tier === "full" ? 2500 : 800;
  const enableBloom = tier === "full";

  return (
    <Canvas
      dpr={[1, Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1)]}
      camera={{ position: [0, 0, 10], fov: 50 }}
      gl={{ antialias: tier === "full", alpha: true }}
    >
      <ParticleField count={particleCount} />
      <CameraRig />
      {enableBloom && (
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.2} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
```

- [ ] **Step 6: Re-run the motion test and type-check**

Run: `npx vitest run src/components/hero/heroMotion.test.ts`
Expected: PASS.
Run: `npm run build:verify` (DB up) — confirms `HeroScene.tsx` type-checks and the bundle builds. Expected: build succeeds; `/` remains a prerendered/static route.

- [ ] **Step 7: Commit**

```bash
git add src/components/hero/heroMotion.ts src/components/hero/heroMotion.test.ts src/components/hero/HeroScene.tsx
git commit -m "Refactor hero into four motion presets driven by --hero-preset"
```

---

### Task 5: Hero-animation picker in the theme form

**Files:**
- Modify: `src/app/admin/(dashboard)/ThemeForm.tsx`
- Modify: `src/app/admin/(dashboard)/ThemeForm.test.tsx`

**Interfaces:**
- Consumes: `HERO_PRESETS`, `DEFAULT_HERO_PRESET`, `HERO_PRESET_LABELS` from `@/lib/heroPresets` (Task 1); `ThemeInput.heroPreset` (Task 2).
- Produces: the form's `onSubmit` payload now includes `heroPreset`.

- [ ] **Step 1: Write the failing tests**

Add these cases inside the `describe("ThemeForm", ...)` block in `src/app/admin/(dashboard)/ThemeForm.test.tsx`:

```ts
  it("defaults the hero animation to orbit and submits it", () => {
    const onSubmit = vi.fn();
    render(<ThemeForm submitLabel="Create theme" onSubmit={onSubmit} submitting={false} />);
    expect(screen.getByRole("radio", { name: /orbit/i })).toBeChecked();
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Vapor" } });
    fireEvent.submit(screen.getByRole("button", { name: /create theme/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ heroPreset: "orbit" }));
  });

  it("submits the chosen hero animation", () => {
    const onSubmit = vi.fn();
    render(<ThemeForm submitLabel="Create theme" onSubmit={onSubmit} submitting={false} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Vapor" } });
    fireEvent.click(screen.getByRole("radio", { name: /pulse/i }));
    fireEvent.submit(screen.getByRole("button", { name: /create theme/i }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ heroPreset: "pulse" }));
  });

  it("pre-selects the hero animation of an existing theme", () => {
    render(
      <ThemeForm
        submitLabel="Save"
        submitting={false}
        onSubmit={vi.fn()}
        initial={{
          id: 3, name: "Sunset", isActive: false, heroPreset: "wave",
          background: "#101010", foreground: "#fafafa", turquoise: "#11ccdd",
          pink: "#ee3388", purple: "#9922ee", green: "#22dd77",
        }}
      />,
    );
    expect(screen.getByRole("radio", { name: /wave/i })).toBeChecked();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/admin/(dashboard)/ThemeForm.test.tsx"`
Expected: FAIL — no radios found; `onSubmit` payload has no `heroPreset`.

- [ ] **Step 3: Add the preset state and radio fieldset**

In `src/app/admin/(dashboard)/ThemeForm.tsx`:

Add the import:
```ts
import { HERO_PRESETS, DEFAULT_HERO_PRESET, HERO_PRESET_LABELS } from "@/lib/heroPresets";
```

Add state beside the existing `name`/`colors` state:
```ts
  const [heroPreset, setHeroPreset] = useState<string>(initial?.heroPreset ?? DEFAULT_HERO_PRESET);
```

Include it in the `onSubmit` payload inside `handleSubmit`:
```ts
    onSubmit({
      name,
      background: colors.background,
      foreground: colors.foreground,
      turquoise: colors.turquoise,
      pink: colors.pink,
      purple: colors.purple,
      green: colors.green,
      heroPreset,
    });
```

Add the fieldset in the JSX between the colour grid (`</div>` closing `themeStyles.slots`) and the `styles.actions` div:
```tsx
      <fieldset className={themeStyles.presetFieldset}>
        <legend className={fieldStyles.label}>Hero animation</legend>
        {HERO_PRESETS.map((preset) => (
          <label key={preset} className={themeStyles.presetOption}>
            <input
              type="radio"
              name="heroPreset"
              value={preset}
              checked={heroPreset === preset}
              onChange={() => setHeroPreset(preset)}
            />
            <span>{HERO_PRESET_LABELS[preset]}</span>
          </label>
        ))}
      </fieldset>
```

- [ ] **Step 4: Add the CSS Module classes**

In `src/app/admin/(dashboard)/themes/themes.module.css`, append:
```css
.presetFieldset {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  padding: 1rem;
}

.presetOption {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run "src/app/admin/(dashboard)/ThemeForm.test.tsx"`
Expected: PASS (existing cases plus the three new ones).

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(dashboard)/ThemeForm.tsx" "src/app/admin/(dashboard)/ThemeForm.test.tsx" "src/app/admin/(dashboard)/themes/themes.module.css"
git commit -m "Add a hero-animation picker to the theme form"
```

---

### Task 6: Show the preset in the themes list

**Files:**
- Modify: `src/app/admin/(dashboard)/themes/page.tsx`
- Modify: `src/app/admin/(dashboard)/themes/page.test.tsx`

**Interfaces:**
- Consumes: `ThemeRowDTO.heroPreset` (Task 2).

- [ ] **Step 1: Write the failing test**

In `src/app/admin/(dashboard)/themes/page.test.tsx`, add `heroPreset` to the two fixtures and a new assertion. Update the `themes` array:
```ts
const themes = [
  { id: 1, name: "Default Neon", isActive: true, heroPreset: "orbit", background: "#0b0e14", foreground: "#ffffff",
    turquoise: "#00f0ff", pink: "#ff2e97", purple: "#b026ff", green: "#39ff88" },
  { id: 2, name: "Sunset", isActive: false, heroPreset: "pulse", background: "#101010", foreground: "#fafafa",
    turquoise: "#11ccdd", pink: "#ee3388", purple: "#9922ee", green: "#22dd77" },
];
```
Add a test inside the describe block:
```ts
  it("shows each theme's hero animation", async () => {
    render(<ThemesListPage />);
    await waitFor(() => expect(screen.getByText("Default Neon")).toBeInTheDocument());
    expect(screen.getByText("pulse")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/admin/(dashboard)/themes/page.test.tsx"`
Expected: FAIL — no element with text "pulse".

- [ ] **Step 3: Add the Animation column**

In `src/app/admin/(dashboard)/themes/page.tsx`, add a column to the `columns` array, after the `swatches` column and before `active`:
```ts
      {
        key: "heroPreset",
        header: "Animation",
        sort: (t) => t.heroPreset ?? "orbit",
        cell: (t) => t.heroPreset ?? "orbit",
      },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/admin/(dashboard)/themes/page.test.tsx"`
Expected: PASS (existing cases plus the new one).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/themes/page.tsx" "src/app/admin/(dashboard)/themes/page.test.tsx"
git commit -m "Show each theme's hero animation in the admin list"
```

---

## Final verification (after all tasks)

- [ ] Run the full suite: `npx vitest run` — expected: all green (the prior count plus the new `heroPresets`, `heroMotion`, validator, form, and list tests).
- [ ] Run `npm run lint` — expected: clean.
- [ ] Run `npm run build:verify` (DB up) — expected: build succeeds; `/` stays static/prerendered; the ~38-page static set is unchanged.
- [ ] Manual (loading the page, since jsdom has no WebGL): seed, then in `/admin/themes` create or edit a theme, pick each animation, activate it, and confirm on `/` that the hero motion changes (orbit ≙ today's hero; drift bobs; pulse breathes; wave ripples) and that reverting to the default theme returns the hero to orbit.
