@AGENTS.md

# samklep.dev

Personal portfolio. **Next.js 15 (App Router) + React 19 + TypeScript + PostgreSQL + MDX.**

Replaces an earlier Express/Sequelize CMS (`port-new`). The governing decision: **no build-your-own
CMS.** Long-form content lives in MDX files in this repo; Postgres holds only queryable metadata
(tags, dates, status, links). The two are joined by `slug`. There is no admin CRUD app and adding
one would undo the point of the rebuild.

## Commands

```bash
npm run dev                # Next dev server
npm run build              # production build (also type-checks and lints)
npm run lint               # eslint

npm run db:up              # start local Postgres container (docker compose up -d --wait)
npm run db:down            # stop it; `docker compose down -v` also wipes the volume
npm run db:generate        # ONLY after editing src/db/schema.ts — emits a new drizzle/*.sql
npm run db:migrate         # apply pending migrations
npm run db:seed            # idempotent, safe to re-run
npm run db:studio          # drizzle-kit studio
```

First-time setup: `npm install && cp .env.example .env && npm run db:up && npm run db:migrate && npm run db:seed`.

## Layout

```
src/app/          routes; page.tsx renders <HeroSection /> + projects section
src/components/   hero/ — HeroSection (GSAP), HeroScene (R3F), HeroStaticFallback
src/lib/          scrollStore.ts (Zustand), useDeviceTier.ts
src/db/           schema.ts, index.ts (client), queries.ts, seed.ts
drizzle/          generated migrations — COMMIT THESE, they are the applied-state source of truth
content/          projects/{slug}.mdx — not yet created
```
Config files (`next.config.ts`, `drizzle.config.ts`, `docker-compose.yml`, `eslint.config.mjs`) and
`public/` stay at the repo root. `@/*` maps to `./src/*`.

## Rules

**Structure**
- Next resolves `./app` *before* `./src/app` (`next/dist/lib/find-pages-dir.js`). A stray root-level
  `app/` silently wins and `src/app/` is ignored — never leave both.
- `tsconfig.json` needs `baseUrl: "."` *and* `paths`. Paths alone does not resolve `@/…` in the
  bundler, and `tsc` passes even when the build would break — verify alias changes with `next build`,
  not just a type-check.

**Styling — CSS Modules, never Tailwind.** Tailwind was deliberately stripped from the
create-next-app default. Do not reintroduce `@tailwind` directives, `tailwind.config.ts`, or
postcss/autoprefixer.

**3D / animation**
- `@react-three/fiber@^9`, `@react-three/drei@^10`, `@react-three/postprocessing@^3` were bumped
  together for React 19 compatibility. Never mix fiber v8/v9 or postprocessing v2/v3 — v8 peer-caps
  at React 18 and postprocessing v2 peer-caps at fiber v8.
- GSAP + ScrollTrigger own DOM/page choreography. R3F's `useFrame` reads scroll progress
  imperatively from the store, never via a hook — a per-frame subscription re-renders the tree.
- All WebGL stays lazy-loaded (`next/dynamic`, `ssr: false`) so it never blocks first paint or
  SEO-relevant content.
- `useDeviceTier` returns `full` (desktop) / `lite` (viewport < 768px or coarse pointer) /
  `static` (`prefers-reduced-motion` or no WebGL), defaulting to `lite` before hydration. Preserve
  the budget it enforces when extending: 2500 particles on `full` vs 800 on `lite`, Bloom on `full`
  only, DPR capped at `Math.min(2, devicePixelRatio)`, a shorter scroll-pin distance on mobile
  (0.7x vs 1.2x viewport height) via `ScrollTrigger.matchMedia()`, and `static` swapping in
  `HeroStaticFallback` — pure CSS, no canvas mounted at all.

**Zustand** is scoped to cross-boundary state shared by the GSAP (DOM) and R3F (WebGL) layers, and
nothing else. Most project data is server-fetched, not client state. If UI state grows (filters,
nav), add a separate `uiStore.ts` rather than overloading `scrollStore.ts`.

**Database**
- Drizzle ORM + `postgres` (postgres-js). Not Sequelize, not Prisma.
- Schema changes are `schema.ts` → `db:generate` → `db:migrate`. Never hand-edit a file in
  `drizzle/`, and never write DDL directly against the database.
- **The seed must stay idempotent.** Use `onConflictDoUpdate`, not `onConflictDoNothing`:
  `.returning()` only yields rows it actually wrote, so a "do nothing" conflict returns an empty
  array and any downstream linking silently does nothing on re-run.
- One-off scripts import `client` from `src/db/index.ts` and `await client.end()` — do not
  `process.exit()` out from under an open socket.
- Postgres sorts NULLs *first* on `DESC`. Any ordering on a nullable column (`startedAt`,
  `completedAt`) needs explicit `nulls last` plus a stable tiebreak.

**ESLint** — `eslint-config-next@15` ships legacy eslintrc objects, not flat config arrays, so
`eslint.config.mjs` routes them through `FlatCompat`. Do not "simplify" it to direct imports and
spreads; that throws "not iterable". It can collapse once the project is on
`eslint-config-next@16+`.

## Design direction: neon cyberpunk

- Dark base, **not** pure black: `#0B0E14` background, `#12161F` card/surface.
- Accents — **one dominates per screen**, the rest are sparse, never equal weight:
  `#00F0FF` turquoise (primary/dominant) · `#FF2E97` pink (secondary/CTA) · `#B026FF` purple
  (gradients and glow only) · `#39FF88` green (**status indicators only**, e.g. "available for
  work" — not general use).
- Type: no Orbitron or on-the-nose "cyberpunk" faces. Display candidates: Cabinet Grotesk, General
  Sans, Space Grotesk. Body: Inter or IBM Plex Sans.
- Banned clichés: scanline overlays, grid-floor backgrounds, chromatic-aberration hovers.
- One orchestrated "boot-up" moment on load (the hero). Do not scatter glitch effects elsewhere.

## Not yet built — in order

1. **Project grid** — `src/app/page.tsx` has a placeholder. Pull from `getPublishedProjects()`.
   Asymmetric: featured project spans 2 columns with a glow border, the rest a tighter single-column
   list with hover-reveal tags.
2. **MDX pipeline** — `content/projects/{slug}.mdx` for the 4 seeded slugs, rendered with
   `next-mdx-remote`. Frontmatter carries `slug` only; all other metadata comes from Postgres.
3. **Nav / layout chrome** — header, mobile nav, footer.
4. **`/projects/[slug]`** — full MDX case study via `getProjectBySlug()`.
5. **Polish** — scroll-reveal on the grid, hover glow states, `@vercel/og` per-project OG images,
   `shiki`/`rehype-pretty-code` highlighting, reading time, last-updated from git metadata.

## Possible future additions

Candidates, not commitments. Roughly cheapest-first; each notes what it costs.

**Cheap, high leverage**

- **Tag filtering on the project index.** The `tags`/`project_tags` join already exists and is
  populated — this is the payoff for putting metadata in Postgres at all, and right now nothing
  reads it. Server component + `searchParams`, no new dependencies, no schema change.
- **Content/DB drift check.** Truth is deliberately split across two stores, so the predictable
  failure is a published row with no `content/projects/{slug}.mdx` (a dead link) or an orphaned MDX
  file that never renders. A script asserting both directions, run in CI and after `db:seed`, costs
  an afternoon and eliminates the entire class.
- **Draft previews.** `projects.status` already carries `draft`, and `getPublishedProjects()`
  already filters on it, but there is no way to *see* a draft. Next's Draft Mode closes the loop so
  case studies can be written and reviewed before going live.
- **Related projects by tag overlap.** One SQL query over `project_tags` ordered by shared-tag
  count. Turns the detail page into a path deeper into the work instead of a dead end.

**Bigger bets**

- **Populate `project_metrics` and surface a stats strip.** The table, relations, and nested fetch
  are built and empty. The work is not engineering — it is digging up real, defensible numbers per
  project. Do not invent them; unverifiable metrics on a portfolio are worse than none.
- **"Ask my portfolio" RAG widget.** Embed the MDX case studies, retrieve, answer with the Claude
  API. This is the one feature that would legitimately back an "AI/Agents" skill tag — **add the tag
  only once this ships**, not as a bare résumé line. Needs pgvector (swap the compose image for
  `pgvector/pgvector`, add an embeddings table), a server route, strict rate limiting, and a token
  budget. Largest scope here by a wide margin; also the most differentiating.
- **GitHub sync at build time.** Pull stars / last-push for rows with a `repoUrl` and cache them in
  Postgres. Makes the page look maintained without manual edits. Watch unauthenticated rate limits
  and fail the build *open*, never closed.
- **Perf budget in CI.** A 3D hero is precisely the thing that silently regresses mobile LCP. The
  `useDeviceTier` tiering deserves a Lighthouse CI guard so a future particle tweak cannot quietly
  cost a second of load time.
- **`/resume` generated from the same Postgres rows.** One source of truth for both the site and the
  PDF, so they cannot drift. Pairs well with the metrics work above.
