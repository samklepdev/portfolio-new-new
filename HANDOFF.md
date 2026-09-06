# Portfolio Rebuild — Handoff

## Goal
Rebuilding samklep.dev as: **Next.js (App Router) + TypeScript + PostgreSQL + MDX**, replacing the
previous Express/Sequelize CMS backend (`port-new` repo). Moving away from a "build-your-own-CMS"
approach — content lives in MDX files in the repo, Postgres only holds queryable metadata
(tags, dates, status, links). No full admin CRUD app planned.

## Design direction: neon cyberpunk
- Dark base, NOT pure black: `#0B0E14` background, `#12161F` card/surface layer
- Neon accents — **one dominates per screen**, others are sparse accents, not equal weight:
  - `#00F0FF` neon turquoise — primary (dominant)
  - `#FF2E97` neon pink — secondary/CTA accent
  - `#B026FF` neon purple — tertiary, gradients/glow only
  - `#39FF88` neon green — reserved for status indicators only (e.g. "available for work"), not general use
- Type: avoid Orbitron/on-the-nose "cyberpunk fonts". Display font candidates: Cabinet Grotesk,
  General Sans, Space Grotesk. Body: Inter or IBM Plex Sans.
- Avoid clichés: no scanline overlays, no grid-floor backgrounds, no chromatic aberration hover effects
- One orchestrated "boot-up" moment on load (hero), not glitch effects scattered everywhere
- **Styling: CSS Modules, NOT Tailwind** (explicitly removed from the create-next-app default —
  strip `@tailwind` directives from `globals.css`, remove tailwind/postcss/autoprefixer from
  package.json, delete `tailwind.config.ts`/`postcss.config.mjs` if present)

## Stack decisions
- **Next.js 15 / React 19** (App Router)
- **3D hero**: React Three Fiber v9 + drei v10 + `@react-three/postprocessing` v3 — these three
  majors were bumped together specifically for React 19 compat; don't mix v8/v9 or v2/v3 across them
- **Scroll orchestration**: GSAP + ScrollTrigger for DOM/page-level choreography (HUD fade, pinning),
  R3F's `useFrame` reads scroll progress imperatively (not via hook) to avoid per-frame re-renders
- **Shared state**: Zustand — scoped ONLY to cross-boundary state needed by both GSAP (DOM) and R3F
  (WebGL) layers (see `lib/scrollStore.ts`). Not meant to become a global app state manager — most
  project data is server-fetched, not client state. If UI state grows (filters, nav), add a
  separate `uiStore.ts` rather than overloading the scroll store.
- **DB**: Drizzle ORM + `postgres` (postgres-js driver), not Sequelize/Prisma (deliberate change
  from the old CMS stack)
- **Content**: `next-mdx-remote` + `gray-matter`, MDX files in `content/projects/{slug}.mdx`,
  joined to Postgres rows by `slug`

## Known gotchas hit during setup (already fixed in current files, but worth knowing)
- `@react-three/fiber@8` peer-caps at React 18 — must use `^9.0.0` for React 19 projects
- `@react-three/postprocessing@2` peer-caps at fiber v8 — must use `^3.0.0` to match fiber v9
- `tsconfig.json` needs both `baseUrl: "."` AND `paths: { "@/*": ["./*"] }` — paths alone isn't
  enough for the bundler to resolve `@/...` imports (TS type-checker may pass even when broken)
- This project **does** use a `src/` directory (`src/app`, `src/components`, `src/lib`, `src/db`).
  Next resolves `./app` *before* `./src/app` (see `next/dist/lib/find-pages-dir.js`), so a stray
  root-level `app/` silently wins over `src/app/` — never leave both. `@/*` maps to `./src/*`.
  Config files (`next.config.ts`, `drizzle.config.ts`, `docker-compose.yml`) stay at the repo root,
  as does `public/`
- WebGL/3D work must stay lazy-loaded (`next/dynamic`, `ssr: false`) so it never blocks first paint
  or SEO-relevant content below the fold

## Current file structure (already built, working)
```
src/app/
  page.tsx                       # renders <HeroSection /> + placeholder projects section
  page.module.css
src/components/hero/
  HeroSection.tsx                # GSAP ScrollTrigger orchestration, HUD overlay, pins hero on scroll
  HeroSection.module.css
  HeroScene.tsx                  # R3F particle field (turquoise-dominant, pink/purple accents),
                                  # tiered particle count + bloom based on device tier
  HeroStaticFallback.tsx         # CSS-only fallback for prefers-reduced-motion / no WebGL
src/lib/
  scrollStore.ts                 # Zustand: scroll progress + heroDismissed, shared GSAP<->R3F
  useDeviceTier.ts                # returns "full" | "lite" | "static" based on viewport/pointer/
                                  # WebGL support/prefers-reduced-motion
src/db/
  schema.ts                      # projects, tags, project_tags (join), project_metrics + relations
  index.ts                       # drizzle + postgres-js client (exports `client` so scripts can
                                  # close it), reused across dev hot-reloads
  queries.ts                     # getPublishedProjects(), getProjectBySlug() — nested tag/metric joins
  seed.ts                        # upserts tags + 4 real projects (bitcoin-storefront,
                                  # veo-design-studio, steady-mat-app, portfolio-cms); idempotent,
                                  # safe to re-run
drizzle/                         # generated migrations — commit these, they are the source of truth
drizzle.config.ts                # points at ./src/db/schema.ts
docker-compose.yml               # local Postgres 17 (named volume, healthcheck)
.env.example                     # DATABASE_URL + POSTGRES_* for the container
package.json
```

## Mobile requirements for the hero (already implemented, verify if extending)
- `useDeviceTier` caps particle count (2500 full / 800 lite) and disables Bloom post-processing on
  mobile/coarse-pointer devices
- GSAP `ScrollTrigger.matchMedia()` gives mobile a shorter scroll-pin distance (0.7x viewport height)
  vs desktop (1.2x)
- `prefers-reduced-motion` swaps to `HeroStaticFallback` (pure CSS gradient, no canvas at all)
- DPR capped at `Math.min(2, window.devicePixelRatio)` to avoid tanking frame rate on high-DPI phones

## Not yet built — next steps, in order
1. **Project grid section** (app/page.tsx currently has a placeholder) — pull from
   `getPublishedProjects()`, asymmetric layout: featured project spans 2 columns w/ glow border,
   rest in a tighter single-column list with hover-reveal tags
2. **MDX content pipeline** — `content/projects/{slug}.mdx` files matching the 4 seeded slugs,
   rendered via `next-mdx-remote`, frontmatter just carries `slug` (rest of metadata comes from Postgres)
3. **Nav / layout chrome** — header, mobile nav, footer (not started)
4. **`/projects/[slug]` detail page** — renders full MDX case study using `getProjectBySlug()`
5. **Polish**: scroll-reveal animations on the grid, hover glow states, `@vercel/og` OG image
   generation per project, RSS feed if a blog gets added, `shiki`/`rehype-pretty-code` syntax
   highlighting, reading time + last-updated from git metadata

## Possible future addition (discussed, not committed)
- A small AI/agents-powered feature (e.g. a RAG-based "ask my portfolio a question" chat widget)
  to legitimately back an "AI/Agents" skill tag — only add the skill tag once there's a real
  project behind it, not as a bare resume line.

## Setup commands
```bash
npm install
cp .env.example .env       # defaults match docker-compose.yml; edit for a hosted DB
npm run db:up              # docker compose up -d --wait (skip if using hosted Postgres)
npm run db:migrate         # applies drizzle/*.sql — db:generate only after schema.ts changes
npm run db:seed            # idempotent, re-run freely
npm run dev
```
`npm run db:down` stops the container; add `-v` manually (`docker compose down -v`) to wipe the
volume and start from an empty database.
