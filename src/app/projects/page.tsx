import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/projects/Pagination";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { getPublishedProjectsPage } from "@/db/queries";
import styles from "./page.module.css";

const PER_PAGE = 9;

type ProjectsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

/** `?page=` is untrusted input — anything that is not a positive integer is 1. */
function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

export async function generateMetadata({
  searchParams,
}: ProjectsPageProps): Promise<Metadata> {
  const page = parsePage((await searchParams).page);

  return {
    title:
      page > 1
        ? `Projects — Page ${page} — Sam Klepper`
        : "Projects — Sam Klepper",
    description: "Full-stack and mobile projects — TypeScript, React, C#.",
  };
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const page = parsePage((await searchParams).page);

  const { projects, total, totalPages } = await getPublishedProjectsPage(
    page,
    PER_PAGE
  );

  if (page > totalPages) notFound();

  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const last = first === 0 ? 0 : first + projects.length - 1;

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>
      <h1 className={styles.heading}>Projects</h1>
      <p className={styles.intro}>
        Everything published, most recent first.
        {total > PER_PAGE && (
          <span className={styles.count}>
            {" "}
            Showing {first}–{last} of {total}.
          </span>
        )}
      </p>
      <ProjectGrid projects={projects} columns={3} />
      <Pagination page={page} totalPages={totalPages} basePath="/projects" />
    </main>
  );
}
