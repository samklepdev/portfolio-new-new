import Image from "next/image";
import Link from "next/link";
import type { PublishedPost } from "@/db/queries";
import { formatPostDate } from "@/lib/postFormat";
import styles from "./PostCard.module.css";

type PostCardProps = {
  post: PublishedPost;
  /** Resolved by the page — see the note in the plan about async children. */
  coverSrc?: string | null;
};

export function PostCard({ post, coverSrc }: PostCardProps) {
  const tags = post.postTags.map((pt) => pt.tag);
  const date = formatPostDate(post.publishedAt);

  return (
    <Link href={`/blog/${post.slug}`} className={styles.card}>
      <article className={styles.inner}>
        {coverSrc && (
          <div className={styles.thumb}>
            <Image
              src={coverSrc}
              alt=""
              fill
              className={styles.thumbImage}
              sizes="(min-width: 900px) 33vw, 100vw"
            />
          </div>
        )}

        <div className={styles.body}>
          <p className={styles.eyebrow}>
            {date && <span>{date}</span>}
            {date && <span aria-hidden="true"> · </span>}
            <span>{post.readingMinutes} min read</span>
          </p>

          <h3 className={styles.title}>{post.title}</h3>
          <p className={styles.excerpt}>{post.excerpt}</p>

          <footer className={styles.footer}>
            {tags.length > 0 && (
              <ul className={styles.tags}>
                {tags.map((tag) => (
                  <li key={tag.id} className={styles.tag}>
                    {tag.name}
                  </li>
                ))}
              </ul>
            )}
            <span className={styles.cta} aria-hidden="true">
              Read <span className={styles.arrow}>→</span>
            </span>
          </footer>
        </div>
      </article>
    </Link>
  );
}
