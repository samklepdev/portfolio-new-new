import Link from "next/link";
import type { PublishedProject } from "@/db/queries";
import styles from "./ProjectCard.module.css";

type ProjectCardProps = {
  project: PublishedProject;
  /** Carries the glow border. Applies to every featured project. */
  featured?: boolean;
  /** The single project that also spans the full grid width. Implies featured. */
  lead?: boolean;
};

export function ProjectCard({
  project,
  featured = false,
  lead = false,
}: ProjectCardProps) {
  const tags = project.projectTags.map((pt) => pt.tag);

  const className = [
    styles.card,
    featured ? styles.featured : "",
    lead ? styles.lead : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={`/projects/${project.slug}`} className={className}>
      <article>
        <header className={styles.header}>
          {project.role && <p className={styles.role}>{project.role}</p>}
          <h3 className={styles.title}>{project.title}</h3>
        </header>

        <p className={styles.summary}>{project.summary}</p>

        {/* Metrics only exist for some projects, and only the wide card has room
            for them — render nothing rather than an empty strip. */}
        {lead && project.metrics.length > 0 && (
          <dl className={styles.metrics}>
            {project.metrics.map((metric) => (
              <div key={metric.id} className={styles.metric}>
                <dt className={styles.metricLabel}>{metric.label}</dt>
                <dd className={styles.metricValue}>{metric.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <footer className={styles.footer}>
          {/* Always in the DOM for crawlers and screen readers — the reveal is
              purely visual, and only on devices that can actually hover. */}
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
            Case study <span className={styles.arrow}>→</span>
          </span>
        </footer>
      </article>
    </Link>
  );
}
