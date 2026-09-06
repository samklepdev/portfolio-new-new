import Link from "next/link";
import styles from "./Pagination.module.css";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Route the page numbers hang off, e.g. "/projects". */
  basePath: string;
};

/**
 * Real links, not buttons — every page is addressable, shareable and
 * crawlable, and the pager works before (or without) hydration.
 */
export function Pagination({ page, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Page 1 lives at the bare path so there are not two URLs for one page.
  const href = (n: number) => (n === 1 ? basePath : `${basePath}?page=${n}`);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className={styles.pagination} aria-label="Projects pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={styles.step}>
          <span aria-hidden="true">←</span> Prev
        </Link>
      ) : (
        <span className={`${styles.step} ${styles.disabled}`}>
          <span aria-hidden="true">←</span> Prev
        </span>
      )}

      <ol className={styles.pages}>
        {pages.map((n) => (
          <li key={n}>
            {n === page ? (
              // The current page is not a link to itself; aria-current tells
              // screen readers which one it is.
              <span
                className={`${styles.page} ${styles.current}`}
                aria-current="page"
              >
                {n}
              </span>
            ) : (
              <Link
                href={href(n)}
                className={styles.page}
                aria-label={`Page ${n}`}
              >
                {n}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={styles.step}>
          Next <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className={`${styles.step} ${styles.disabled}`}>
          Next <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}
