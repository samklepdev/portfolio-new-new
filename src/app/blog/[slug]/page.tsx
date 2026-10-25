import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPostBySlug, getPublishedPosts } from "@/db/queries";
import { resolvePublicImage } from "@/lib/content";
import { formatPostDate } from "@/lib/postFormat";
import prose from "@/styles/prose.module.css";
import styles from "./page.module.css";

export const revalidate = 60;

type PageProps = {
  // Next 15 passes route params as a Promise — they must be awaited.
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts
    .filter((post) => Boolean(post.content))
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.status !== "published" || !post.content) {
    return { title: "Not found — Sam Klepper" };
  }

  return {
    title: `${post.title} — Sam Klepper`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await getPostBySlug(slug);

  if (!post || post.status !== "published" || !post.content) {
    notFound();
  }

  const tags = post.postTags.map((pt) => pt.tag);
  const date = formatPostDate(post.publishedAt);
  const cover = await resolvePublicImage(post.coverImage);

  return (
    <main className={styles.page}>
      <Link href="/blog" className={styles.back}>
        <span aria-hidden="true">←</span> Blog
      </Link>

      <header className={styles.header}>
        <p className={styles.eyebrow}>
          {date && <span>{date}</span>}
          {date && <span aria-hidden="true"> · </span>}
          <span>{post.readingMinutes} min read</span>
        </p>

        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.excerpt}>{post.excerpt}</p>

        {tags.length > 0 && (
          <ul className={styles.tags}>
            {tags.map((tag) => (
              <li key={tag.id} className={styles.tag}>
                {tag.name}
              </li>
            ))}
          </ul>
        )}
      </header>

      {cover && (
        <div className={styles.cover}>
          <Image
            src={cover}
            alt=""
            width={1536}
            height={864}
            className={styles.coverImage}
            sizes="(min-width: 768px) 48rem, 100vw"
            priority
          />
        </div>
      )}

      <article className={prose.prose}>
        <MDXRemote source={post.content} />
      </article>
    </main>
  );
}
