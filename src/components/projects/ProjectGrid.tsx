import type { PublishedProject } from "@/db/queries";
import { ProjectCard } from "./ProjectCard";
import styles from "./ProjectGrid.module.css";

type ProjectGridProps = {
  projects: PublishedProject[];
  /**
   * Promotes the first project to the wide featured card. Opt-in because
   * /projects is a uniform list — only the home page has a focal point.
   */
  featureFirst?: boolean;
};

export function ProjectGrid({
  projects,
  featureFirst = false,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return <p className={styles.empty}>No published projects yet.</p>;
  }

  // The queries already sort featured first, so "the first project" is the one
  // the database intends to lead with rather than an arbitrary pick.
  const leadId = featureFirst ? projects[0].id : undefined;

  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          featured={project.id === leadId}
        />
      ))}
    </div>
  );
}
