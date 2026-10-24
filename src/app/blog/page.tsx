import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/projects/Pagination";
import { PostCard } from "@/components/blog/PostCard";
import { PostList } from "@/components/blog/PostList";
import { TagFilter } from "@/components/blog/TagFilter";
import {
  getFeaturedPosts,
  getPostTagNames,
  getPublishedPostsCount,
  getPublishedPostsPage,
} from "@/db/queries";
import { resolvePublicImage } from "@/lib/content";
import { tagSlug } from "@/lib/tagSlug";
import styles from "./page.module.css";

export const POSTS_PER_PAGE = 6;

// The featured band's job is to surface picks out of a list too long to take in
// at once. Below one page's worth it just re-prints cards the reader can
// already see. Keep this equal to POSTS_PER_PAGE — the rule is "once the list
// fills a page", not "once there are six posts".
export const FEATURED_MIN_POSTS = 6;

type BlogPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** `?page=` is untrusted input — anything that is not a positive integer is 1. */
function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

function parseTag(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export const metadata: Metadata = {
  title: "Blog — Sam Klepper",
  description: "Notes on building things with TypeScript, React and Postgres.",
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const requestedTag = parseTag(params.tag);

  const chips = (await getPostTagNames()).map((name) => ({
    name,
    slug: tagSlug(name),
  }));

  const activeTag = requestedTag
    ? chips.find((chip) => chip.slug === requestedTag)
    : undefined;

  if (requestedTag && !activeTag) notFound();

  const [{ posts, totalPages }, totalPublished] = await Promise.all([
    getPublishedPostsPage(page, POSTS_PER_PAGE, activeTag?.name),
    getPublishedPostsCount(),
  ]);

  if (page > totalPages) notFound();

  const bandAllowed =
    page === 1 && !activeTag && totalPublished >= FEATURED_MIN_POSTS;

  const featured = bandAllowed ? await getFeaturedPosts(3) : [];

  // Covers are resolved here rather than inside PostCard so the card stays a
  // synchronous component — an async child cannot be rendered by the tests.
  const featuredCards = await Promise.all(
    featured.map(async (post) => ({
      post,
      coverSrc: await resolvePublicImage(post.coverImage),
    }))
  );

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>

      <h1 className={styles.heading}>Blog</h1>
      <p className={styles.intro}>
        Notes on building things — what broke, and what the fix actually was.
      </p>

      {featuredCards.length > 0 && (
        <section className={styles.featured} aria-labelledby="featured-heading">
          <h2 id="featured-heading" className={styles.featuredHeading}>
            Featured
          </h2>
          <div className={styles.featuredGrid}>
            {featuredCards.map(({ post, coverSrc }) => (
              <PostCard key={post.slug} post={post} coverSrc={coverSrc} />
            ))}
          </div>
        </section>
      )}

      <TagFilter tags={chips} activeSlug={activeTag?.slug} />

      <PostList posts={posts} />

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/blog"
        label="Blog pagination"
      />
    </main>
  );
}
