import type { PublishedProject } from "@/db/queries";
import { ProjectCard } from "./ProjectCard";
import styles from "./ProjectGrid.module.css";

type ProjectGridProps = {
  projects: PublishedProject[];
};

export function ProjectGrid({ projects }: ProjectGridProps) {
  if (projects.length === 0) {
    return <p className={styles.empty}>No published projects yet.</p>;
  }

  // getPublishedProjects() already sorts featured first, so the lead card is
  // simply the head of the list when it is featured. Only one project gets the
  // wide slot no matter how many carry the flag — two focal points is none.
  const [lead, ...rest] = projects;
  const leadIsFeatured = lead.featured;

  return (
    <div className={styles.grid}>
      {leadIsFeatured ? (
        <>
          <ProjectCard project={lead} featured />
          {rest.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </>
      ) : (
        projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))
      )}
    </div>
  );
}
