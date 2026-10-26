import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/projects/Pagination";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { IndustryFilter } from "@/components/projects/IndustryFilter";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getPublishedProjectIndustries,
  getPublishedProjectsPage,
} from "@/db/queries";
import { tagSlug } from "@/lib/tagSlug";
import styles from "./page.module.css";

const PER_PAGE = 9;

type ProjectsPageProps = {
  searchParams: Promise<{ page?: string | string[]; industry?: string | string[] }>;
};

/** `?page=` is untrusted input — anything that is not a positive integer is 1. */
function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

function parseIndustry(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
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
  const params = await searchParams;
  const page = parsePage(params.page);
  const requestedIndustry = parseIndustry(params.industry);

  const industries = (await getPublishedProjectIndustries()).map((name) => ({
    name,
    slug: tagSlug(name),
  }));

  const activeIndustry = requestedIndustry
    ? industries.find((industry) => industry.slug === requestedIndustry)
    : undefined;

  if (requestedIndustry && !activeIndustry) notFound();

  const { projects, total, totalPages } = await getPublishedProjectsPage(
    page,
    PER_PAGE,
    activeIndustry?.name
  );

  if (page > totalPages) notFound();

  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const last = first === 0 ? 0 : first + projects.length - 1;

  return (
    <main className={styles.page}>
      <PageHeader
        title="Projects"
        backLinkText="Home"
        subtitle={
          <>
            {activeIndustry
              ? `Published work for the ${activeIndustry.name} industry.`
              : "Everything published, most recent first."}
            {total > PER_PAGE && (
              <span className={styles.count}>
                {" "}
                Showing {first}–{last} of {total}.
              </span>
            )}
          </>
        }
      />
      <IndustryFilter industries={industries} activeSlug={activeIndustry?.slug} />
      {projects.length > 0 ? (
        <ProjectGrid projects={projects} columns={3} />
      ) : (
        <p className={styles.empty}>No projects for this industry yet.</p>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/projects"
        query={activeIndustry ? { industry: activeIndustry.slug } : undefined}
      />
    </main>
  );
}
