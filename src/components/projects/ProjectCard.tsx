import Image from "next/image";
import Link from "next/link";
import type { PublishedProject } from "@/db/queries";
import { resolvePublicImage } from "@/lib/content";
import styles from "./ProjectCard.module.css";

type ProjectCardProps = {
  project: PublishedProject;
  featured?: boolean;
};

export async function ProjectCard({
  project,
  featured = false,
}: ProjectCardProps) {
  const tags = project.projectTags.map((pt) => pt.tag);
  const cover = await resolvePublicImage(project.coverImage);

  const className = [styles.card, featured ? styles.featured : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={`/projects/${project.slug}`} className={className}>
      <article className={styles.inner}>
        {cover && (
          <div className={styles.thumb}>
            <Image
              src={cover}
              alt=""
              fill
              className={styles.thumbImage}
              sizes={
                featured
                  ? "(min-width: 900px) 55vw, 100vw"
                  : "(min-width: 768px) 50vw, 100vw"
              }
            />
          </div>
        )}

        <div className={styles.body}>
          <header className={styles.header}>
            {(project.category ?? project.role) && (
              <p className={styles.eyebrow}>{project.category ?? project.role}</p>
            )}
            <h3 className={styles.title}>{project.title}</h3>
          </header>

          <p className={styles.summary}>{project.summary}</p>

          {featured && project.metrics.length > 0 && (
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
              View project <span className={styles.arrow}>→</span>
            </span>
          </footer>
        </div>
      </article>
    </Link>
  );
}
