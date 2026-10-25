# samklep.dev

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Postgres](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MDX](https://img.shields.io/badge/MDX-Content-000000?logo=mdx&logoColor=white)](https://mdxjs.com/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)

Personal portfolio and case-study site for Sam Klep. Built with Next.js 15, React 19, TypeScript, PostgreSQL, and MDX, it pairs editorial writing with a structured metadata layer: long-form project work lives in version-controlled MDX files, while Postgres stores queryable data like tags, dates, URLs, status, and metrics.

## Highlights

- Featured project grid with ordering and pagination
- Case-study detail pages generated from MDX content
- Content + metadata split designed to keep writing in source control and filtering in the database
- Contact form with persistence and Resend notifications
- Dark cyberpunk visual system with CSS Modules and lightweight motion/3D layers

## Screenshot

![Portfolio preview](public/images/screenshots/portfolio/portfolio-screenshot-homepage.png)

## Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- PostgreSQL + Drizzle ORM + postgres.js
- MDX (`gray-matter`, `next-mdx-remote`)
- GSAP + ScrollTrigger
- React Three Fiber / Drei / postprocessing
- Vitest + Testing Library

## Architecture

The project intentionally separates content from indexing:

- `src/content/...` stores MDX story files and frontmatter
- `src/db/schema.ts` defines the database schema
- `src/db/queries.ts` exposes server-side project and post queries
- `src/lib/content.ts` resolves MDX files by `slug`
- `src/app/*` handles routes, layouts, and server actions

This keeps long-form writing in Git while preserving queryable, filterable metadata in Postgres.

## Feature matrix

| Area | Implementation | Notes |
| --- | --- | --- |
| Content model | MDX + frontmatter | Project narratives live in repo files |
| Data layer | PostgreSQL + Drizzle | Tags, dates, status, links, metrics |
| UI | Next.js App Router | Server-rendered pages with client enhancements |
| Motion | GSAP + R3F | Hero and layered visual behavior |
| Styling | CSS Modules | No Tailwind; custom design system |
| Forms | Server action + Postgres | Contact submissions stored locally |
| Notifications | Resend | Email alerts for inbound messages |
| Testing | Vitest + Testing Library | Component and page-level checks |

## Getting started

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Then open `http://localhost:3000`.

## Environment

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/portfolio
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=portfolio
POSTGRES_PORT=5432
RESEND_API_KEY=
CONTACT_TO_EMAIL=hello@samklep.dev
CONTACT_FROM_EMAIL=contact@samklep.dev
```

## Useful scripts

```bash
npm run dev
npm run build
npm run build:verify
npm run lint
npm run test
npm run db:up
npm run db:down
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Notes

- Use `npm run build:verify` instead of `npm run build` while `next dev` is running.
- Schema changes follow: `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`.
- Long-form content should live in `src/content/*`; Postgres is the queryable index, not the source of truth for the writing itself.

## License

This project is for personal portfolio use and reflects a custom design and implementation for Sam Klep.
