import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/projects/Pagination";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { getPublishedProjectsPage } from "@/db/queries";
import styles from "./page.module.css";

const PER_PAGE = 9; // three rows of three

// No `revalidate` export here: reading searchParams opts the route into dynamic
// rendering, so it queries Postgres per request and always reflects the current
// data. That is the trade for addressable ?page= URLs. The home page and the
// detail pages keep their ISR caching.

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
    // Distinct titles per page, so the paginated URLs do not all compete as
    // duplicates of each other.
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

  // Everything published, featured included — the home page shows a subset.
  const { projects, total, totalPages } = await getPublishedProjectsPage(
    page,
    PER_PAGE
  );

  // A page past the end is a dead URL, not an empty grid.
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
