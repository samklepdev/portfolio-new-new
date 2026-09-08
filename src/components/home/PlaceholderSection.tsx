import Link from "next/link";
import styles from "./PlaceholderSection.module.css";

type PlaceholderSectionProps = {
  /** Anchor target, so the header can link to `/#about` and `/#contact`. */
  id: string;
  title: string;
  /** Where the full version of this section lives. */
  href: string;
  linkLabel: string;
};

/**
 * Holds the ground for a home-page section whose layout has not been designed
 * yet — a heading, an anchor, and a way through to the real page. Intended to
 * be replaced outright rather than grown: once About and Contact have their own
 * home-page layouts, each becomes its own component and this file goes away.
 */
export function PlaceholderSection({
  id,
  title,
  href,
  linkLabel,
}: PlaceholderSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section className={styles.section} id={id} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          {title}
        </h2>
        <Link href={href} className={styles.link}>
          {linkLabel} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
