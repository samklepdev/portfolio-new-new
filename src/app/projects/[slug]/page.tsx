import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getProjectBySlug, getPublishedProjects } from "@/db/queries";
import { resolvePublicImage } from "@/lib/content";
import { ProjectTabs, type ProjectTab } from "@/components/projects/ProjectTabs";
import styles from "./page.module.css";
import prose from "@/styles/prose.module.css";

export const revalidate = 60;

type PageProps = {
  // Next 15 passes route params as a Promise — they must be awaited.
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const projects = await getPublishedProjects();
  return projects
    .filter((project) => Boolean(project.content))
    .map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project || project.status !== "published" || !project.content) {
    return { title: "Not found — Sam Klepper" };
  }

  return {
    title: `${project.title} — Sam Klepper`,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;

  const project = await getProjectBySlug(slug);

  if (!project || project.status !== "published" || !project.content) {
    notFound();
  }

  const tags = project.projectTags.map((pt) => pt.tag);
  const tabs = await buildTabs(project);

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

      <article className={prose.prose}>
        <MDXRemote source={project.content} />
      </article>

      <ProjectTabs tabs={tabs} />
    </main>
  );
}

async function buildTabs(project: {
  techDescription: string | null;
  techTabImage: string | null;
  techTabImageAlt: string | null;
  designDescription: string | null;
  designTabImage: string | null;
  designTabImageAlt: string | null;
}): Promise<ProjectTab[]> {
  const sources = [
    {
      id: "tech",
      label: "Tech",
      description: project.techDescription,
      image: project.techTabImage,
      alt: project.techTabImageAlt,
    },
    {
      id: "design",
      label: "Design",
      description: project.designDescription,
      image: project.designTabImage,
      alt: project.designTabImageAlt,
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
