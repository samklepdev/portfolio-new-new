import Link from "next/link";
import styles from "./TagFilter.module.css";

export type TagChip = { name: string; slug: string };

type TagFilterProps = {
  tags: TagChip[];
  activeSlug?: string;
};

export function TagFilter({ tags, activeSlug }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <nav className={styles.filter} aria-label="Filter posts by tag">
      <Link
        href="/blog"
        className={[styles.chip, !activeSlug && styles.active].filter(Boolean).join(" ")}
        aria-current={!activeSlug ? "page" : undefined}
      >
        All
      </Link>

      {tags.map((tag) => (
        <Link
          key={tag.slug}
          href={`/blog?tag=${tag.slug}`}
          className={[styles.chip, activeSlug === tag.slug && styles.active]
            .filter(Boolean)
            .join(" ")}
          aria-current={activeSlug === tag.slug ? "page" : undefined}
        >
          {tag.name}
        </Link>
      ))}
    </nav>
  );
}
