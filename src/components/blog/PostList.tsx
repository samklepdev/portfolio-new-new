import Link from "next/link";
import type { PublishedPost } from "@/db/queries";
import { formatPostDate } from "@/lib/postFormat";
import styles from "./PostList.module.css";

export function PostList({ posts }: { posts: PublishedPost[] }) {
  if (posts.length === 0) {
    return <p className={styles.empty}>No posts yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {posts.map((post) => {
        const date = formatPostDate(post.publishedAt);

        return (
          <li key={post.slug} className={styles.row}>
            <div className={styles.meta}>
              {date && <span className={styles.date}>{date}</span>}
              <span className={styles.reading}>{post.readingMinutes} min read</span>
            </div>

            <div className={styles.main}>
              <h2 className={styles.title}>
                <Link href={`/blog/${post.slug}`} className={styles.link}>
                  <span className={styles.hit} />
                  {post.title}
                </Link>
              </h2>
              <p className={styles.excerpt}>{post.excerpt}</p>
              <span className={styles.cta} aria-hidden="true">
                Read more <span className={styles.arrow}>→</span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
