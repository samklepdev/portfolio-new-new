import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getProjectBySlug, getPublishedProjects } from "@/db/queries";
import {
  getContentSlugs,
  getProjectContent,
  resolvePublicImage,
} from "@/lib/content";
import { ProjectTabs, type ProjectTab } from "@/components/projects/ProjectTabs";
import styles from "./page.module.css";

export const revalidate = 60;

type PageProps = {
  // Next 15 passes route params as a Promise — they must be awaited.
  params: Promise<{ slug: string }>;
};

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

  const [project, content] = await Promise.all([
    getProjectBySlug(slug),
    getProjectContent(slug),
  ]);

  if (!project || project.status !== "published" || !content) {
    notFound();
  }

  const tags = project.projectTags.map((pt) => pt.tag);
  const tabs = await buildTabs(content.frontmatter);

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

      <ProjectTabs tabs={tabs} />
    </main>
  );
}

async function buildTabs(
  frontmatter: Record<string, unknown>
): Promise<ProjectTab[]> {
  const sources = [
    {
      id: "tech",
      label: "Tech",
      description: frontmatter.techDescription,
      image: frontmatter.techTabImg,
      alt: frontmatter.techTabImgAlt,
    },
    {
      id: "design",
      label: "Design",
      description: frontmatter.designDescription,
      image: frontmatter.designTabImg,
      alt: frontmatter.designTabImgAlt,
    },
  ];

  const tabs: ProjectTab[] = [];

  for (const source of sources) {
    if (typeof source.description !== "string" || !source.description.trim()) {
      continue;
    }

    const src = await resolvePublicImage(source.image);

    tabs.push({
      id: source.id,
      label: source.label,
      image: src
        ? { src, alt: typeof source.alt === "string" ? source.alt : "" }
        : null,
      content: <MDXRemote source={source.description} />,
    });
  }

  return tabs;
}
