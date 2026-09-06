import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getProjectBySlug, getPublishedProjects } from "@/db/queries";
import { getContentSlugs, getProjectContent } from "@/lib/content";
import styles from "./page.module.css";

export const revalidate = 60;

type PageProps = {
  // Next 15 passes route params as a Promise — they must be awaited.
  params: Promise<{ slug: string }>;
};

/**
 * Prerender only the slugs that are both published and have an MDX file.
 * Truth is split across Postgres and the filesystem, so the intersection is the
 * set that can actually render; anything else falls through to a 404.
 */
export async function generateStaticParams() {
  const [projects, contentSlugs] = await Promise.all([
    getPublishedProjects(),
    getContentSlugs(),
  ]);
  const withContent = new Set(contentSlugs);

  return projects
    .filter((project) => withContent.has(project.slug))
    .map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project || project.status !== "published") {
    return { title: "Not found — Sam Klepper" };
  }

  return {
    title: `${project.title} — Sam Klepper`,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;

  // Metadata from Postgres, prose from MDX, joined by slug.
  const [project, content] = await Promise.all([
    getProjectBySlug(slug),
    getProjectContent(slug),
  ]);

  // A draft or missing row is a 404, as is a published row with no MDX file —
  // rendering a case study with no case study would be worse than not found.
  if (!project || project.status !== "published" || !content) {
    notFound();
  }

  const tags = project.projectTags.map((pt) => pt.tag);

  return (
    <main className={styles.page}>
      <Link href="/projects" className={styles.back}>
        <span aria-hidden="true">←</span> Projects
      </Link>

      <header className={styles.header}>
        {project.role && <p className={styles.role}>{project.role}</p>}
        <h1 className={styles.title}>{project.title}</h1>
        <p className={styles.summary}>{project.summary}</p>

        {tags.length > 0 && (
          <ul className={styles.tags}>
            {tags.map((tag) => (
              <li key={tag.id} className={styles.tag}>
                {tag.name}
              </li>
            ))}
          </ul>
        )}

        {(project.repoUrl || project.liveUrl) && (
          <p className={styles.links}>
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Live site <span aria-hidden="true">↗</span>
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source <span aria-hidden="true">↗</span>
              </a>
            )}
          </p>
        )}

        {project.metrics.length > 0 && (
          <dl className={styles.metrics}>
            {project.metrics.map((metric) => (
              <div key={metric.id} className={styles.metric}>
                <dt className={styles.metricLabel}>{metric.label}</dt>
                <dd className={styles.metricValue}>{metric.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <article className={styles.prose}>
        <MDXRemote source={content.body} />
      </article>
    </main>
  );
}
