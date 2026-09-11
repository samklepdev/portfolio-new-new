# Blog — design

**Date:** 2026-09-11
**Status:** approved, not yet implemented

Adds a blog at `/blog` and `/blog/[slug]`, adapted from the Radiant Tailwind template's
Sanity-backed blog pages. Radiant supplies the structure only; everything is rebuilt as CSS
Modules against the existing MDX + Postgres pipeline, with no new dependency — the same
adaptation the contact page and services bento went through.

## What Radiant contributed, and what was dropped

The two reference files (`/page.tsx` at the repo root, `src/content/posts/page.tsx`) are
Tailwind + Sanity: `@headlessui`, `@heroicons`, `dayjs`, `clsx`, `PortableText`, `@/sanity/*`.
None of those enter this repo.

Kept: the post-list row layout, the featured band, category filtering (as tags), pagination.

Dropped:

- **Author blocks.** Radiant renders an avatar and name on every list row, every featured card,
  and in the post sidebar. This is a single-author site, so all of it is noise.
- **RSS.** Radiant links `/blog/feed.xml`. Declined for now; it stays cheap to add later since
  the posts table is the only input it would need.
- **`dayjs`.** See "Date formatting" below.

## Data

The governing split is unchanged: long-form content is MDX in the repo, Postgres holds only
queryable metadata, joined by `slug`. Posts follow projects exactly.

`src/content/posts/{slug}.md` — body plus frontmatter: `title`, `excerpt`, `publishedAt`,
`tags`, `coverImage`, `featured`, `status`.

### Schema

New tables in `src/db/schema.ts`, then `db:generate` → `db:migrate`, committing the generated
`drizzle/*.sql`. Never hand-edit the migration.

```
posts       id, slug (unique), title, excerpt, status default 'published',
            featured, publishedAt (date, nullable), coverImage,
            readingMinutes, createdAt, updatedAt
post_tags   postId + tagId, composite primary key
```

`post_tags` references the **existing `tags` table** with `kind: 'topic'`. That table already
carries a `kind` column to separate vocabularies, so a second tag table would be redundant and
would prevent a topic ever lining up with a project's tech tag.

Relations mirror `projectsRelations` / `projectTagsRelations`.

### Ordering

```
publishedAt desc nulls last, id asc
```

Postgres sorts NULLs **first** on `DESC`. Without `nulls last`, a post with no `publishedAt`
leads the blog. `id asc` is the stable tiebreak for posts sharing a date.

### Queries

In `src/db/queries.ts`, alongside the project queries:
`getPublishedPosts`, `getPublishedPostsPage(page, perPage, tag?)`, `getFeaturedPosts(limit)`,
`getPostBySlug`, `getPostTags` (the filter chips), `getPostsCount(tag?)`.

### Seed

`readPosts()` in `src/db/seed.ts`, mirroring `readProjects()`. Upserts with
**`onConflictDoUpdate`, never `onConflictDoNothing`** — `.returning()` only yields rows it
actually wrote, so a do-nothing conflict returns an empty array and the `post_tags` linking
below it silently does nothing on the second run. The seed must stay idempotent.

`readingMinutes` is computed here, `ceil(words / 200)` over the MDX body.

## Changes to existing code

Two targeted edits. Both exist because posts need something projects already has.

**`src/lib/content.ts` is parameterized by collection.** It currently hardcodes `CONTENT_DIR`
to `src/content/projects`, so posts cannot use it at all. The collection becomes an argument;
`getProjectContent(slug)` and `getPostContent(slug)` are thin wrappers over it. `seed.ts` and
`projects/[slug]/page.tsx` keep their current imports and do not change.

**The `.prose` rules move to `src/styles/prose.module.css`.** Lines 111–192 of
`src/app/projects/[slug]/page.module.css` are already a complete dark-theme MDX stylesheet —
headings, lists, blockquote, inline and fenced code, images, rules. The post body needs exactly
those rules. Copying 80 lines of CSS into a second module guarantees the two drift, so both
detail pages import the shared module instead.

`Pagination`'s hardcoded `aria-label="Projects pagination"` becomes an optional prop defaulting
to its current value.

`NAV_LINKS` in `src/lib/siteLinks.ts` gains `{ href: "/blog", label: "Blog" }` between Projects
and Contact. `Header`'s `isActive` already uses `startsWith`, so `/blog/*` highlights the tab.

## Routes

### `/blog`

Replaces the placeholder stub. Structure matches `/projects`: `.page` at `max-width: 78rem`
with `6rem 2rem` padding, mono back-link to Home, `.heading` at 2.5rem, `.intro` beneath it.

Then, in order: featured band → tag chips → post list → pagination.

`POSTS_PER_PAGE = 6`.

### When the featured band renders

All four must hold:

1. Page 1.
2. No active tag filter.
3. At least one published post is `featured`.
4. **At least `FEATURED_MIN_POSTS = 6` published posts exist in total.**

Condition 4 is the gate. The band's job is to surface a few picks out of a list too long to take
in at once; below a page's worth of posts it does the opposite, re-printing cards the reader can
already see immediately beneath them. That redundancy is what got the testimonial cut from
`/contact`. Six is one full page, so the band appears exactly when the list stops fitting on one
screen and a shortcut starts being worth its space.

Both constants live beside each other in `src/app/blog/page.tsx`. They are deliberately equal and
should be kept that way — if `POSTS_PER_PAGE` changes, `FEATURED_MIN_POSTS` follows it, because
the rule being encoded is "once the list fills a page," not "once there are six posts."

`?page=` and `?tag=` are untrusted. `page` is parsed exactly like `parsePage` in
`src/app/projects/page.tsx` — anything that is not a positive integer is 1 — and a page past the
last one is a 404, as is an unknown tag.

### `/blog/[slug]`

Replaces the placeholder stub. `generateStaticParams` intersects published rows with on-disk
slugs, the same guard `projects/[slug]` uses: a DB row whose MDX file is missing must not
produce a prerendered dead page. `revalidate = 60`.

Layout: back-link to Blog, date and reading-time eyebrow, `h1`, excerpt, tag chips, optional
cover image, then `<MDXRemote source={content.body} />` inside the shared prose container.

## Components — `src/components/blog/`

`PostCard` (featured band), `PostList` (the bordered rows), `TagFilter` (chips). All server
components; none needs client JS.

Chrome is taken directly from `ProjectCard` so the blog reads as the same site: `#12161f`
surface on a `rgba(255,255,255,.08)` hairline, `0.75rem` radius, hover lift with turquoise
border and glow, mono uppercase eyebrow at `rgba(255,255,255,.45)`, pink `→` CTA. Tag chips are
the established `999px` pill with a turquoise border and mono `0.6875rem` label.

Every module ends with the two guards the rest of the codebase uses: `@media (hover: hover) and
(pointer: fine)` around hover-only treatments, so touch does not latch `:hover` after a tap, and
`@media (prefers-reduced-motion: reduce)` zeroing transitions and transforms.

Post rows carry date and reading time in the left column, title, excerpt and "Read more →" in
the right — Radiant's three-column grid with the author block removed.

## Date formatting

`Intl.DateTimeFormat` with `timeZone: "UTC"` pinned explicitly. Not `dayjs`, which would be a
new dependency for one format string.

The pin is load-bearing. `publishedAt` is a date-only column; formatting it in the server's zone
and then again in the visitor's can land on different calendar days and trip a hydration
mismatch. Anything that formats a post date uses the same pinned formatter.

## Thin and empty states

The blog ships with one post, so most of these are the normal case at launch rather than edge
cases.

- No posts at all → "No posts yet."
- Fewer than `FEATURED_MIN_POSTS`, or nothing featured → the band is omitted entirely, not
  rendered empty. At launch this is the live behaviour, not a fallback.
- Under two pages → `Pagination` already returns `null`.
- No tags → the chip row is omitted.

## Content

One placeholder post, `src/content/posts/hello-world.md`, exercising every MDX element the prose
stylesheet covers: `h2`, `h3`, paragraphs, bold, inline code, a fenced code block, bulleted and numbered
lists, a blockquote, a horizontal rule, and a link. Its purpose is to verify the styling, so it
makes no factual claims.

It carries two tags, so the filter chips render on the live page rather than shipping unverified.

It is **not** marked `featured`. With the band now gated at `FEATURED_MIN_POSTS`, the flag would
have no visible effect at one post, so setting it would only plant a claim about the post that
nothing honours — and would quietly change the page the moment a sixth post landed.

Two components therefore ship without appearing on the live page at launch: `PostCard` and
`Pagination`. Both are covered by unit tests instead, including a test that asserts the band is
absent below the threshold *and* present above it, so the gate itself is verified rather than
merely being the reason nothing renders.

## Testing

vitest + testing-library, following the existing pattern of a `*.test.tsx` beside each component
and a `page.test.tsx` per route. Existing tests do not touch the database; page tests mock the
query layer the way `contact/page.test.tsx` mocks the server action.

- `PostCard`, `PostList`, `TagFilter` render tests.
- `blog/page.test.tsx` — exactly one `h1`, rows render, chip hrefs carry the right `?tag=`.
- The featured-band gate, as its own set of cases: absent below `FEATURED_MIN_POSTS`, absent at
  or above it when nothing is featured, absent on page 2, absent under an active tag filter,
  present when all four conditions hold. This is the one piece of logic on the page that cannot
  be checked by looking at the site, since its default state at launch is "not rendered."
- `Pagination` returns `null` under two pages.
- `content.ts` — collections stay scoped to their own directory, and the slug regex rejects
  path traversal.

## Cleanup

Both Radiant reference files are deleted once adapted: `/page.tsx` at the repo root and
`src/content/posts/page.tsx`.

The root file is **not** the routing hazard documented in CLAUDE.md — that trap is specifically a
root-level `app/` directory beating `src/app/`, and a bare `page.tsx` at the repo root is not a
route. It is deleted as clutter, not as a fix. `src/content/posts/page.tsx` is currently harmless
only because `getContentSlugs` filters on `.md`.
