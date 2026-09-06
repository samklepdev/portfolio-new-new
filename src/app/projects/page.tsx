import type { Metadata } from "next";
import Link from "next/link";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { getPublishedProjects } from "@/db/queries";
import styles from "./page.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Projects — Sam Klepper",
  description: "Full-stack and mobile projects — TypeScript, React, C#.",
};

export default async function ProjectsPage() {
  // Everything published, featured included — the home page shows a subset.
  const projects = await getPublishedProjects();

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>
      <h1 className={styles.heading}>Projects</h1>
      <p className={styles.intro}>
        Everything published, most recent first.
      </p>
      <ProjectGrid projects={projects} />
    </main>
  );
}
