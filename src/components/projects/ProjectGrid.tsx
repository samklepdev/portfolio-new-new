import type { PublishedProject } from "@/db/queries";
import { ProjectCard } from "./ProjectCard";
import styles from "./ProjectGrid.module.css";

type ProjectGridProps = {
  projects: PublishedProject[];
  featureFirst?: boolean;
  columns?: 2 | 3;
};

export function ProjectGrid({
  projects,
  featureFirst = false,
  columns = 2,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return <p className={styles.empty}>No published projects yet.</p>;
  }

  const leadId = featureFirst ? projects[0].id : undefined;

  return (
    <div
      className={`${styles.grid} ${columns === 3 ? styles.three : styles.two}`}
    >
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
