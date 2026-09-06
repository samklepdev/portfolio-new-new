import type { PublishedProject } from "@/db/queries";
import { ProjectCard } from "./ProjectCard";
import styles from "./ProjectGrid.module.css";

/**
 * How many projects can carry the featured treatment at once. Flagging more
 * than this in the database is not an error — the extras simply render as
 * ordinary cards, so the section cannot dilute itself.
 */
const MAX_FEATURED = 3;

type ProjectGridProps = {
  projects: PublishedProject[];
};

export function ProjectGrid({ projects }: ProjectGridProps) {
  if (projects.length === 0) {
    return <p className={styles.empty}>No published projects yet.</p>;
  }

  // getPublishedProjects() already sorts featured first, so slicing here takes
  // them in the order the query intends rather than an arbitrary subset.
  const featuredIds = new Set(
    projects
      .filter((project) => project.featured)
      .slice(0, MAX_FEATURED)
      .map((project) => project.id)
  );

  // Only the first featured project gets the wide slot — the rest keep the glow
  // but sit in the normal grid, so the section still has one focal point.
  const leadId = projects.find((project) => featuredIds.has(project.id))?.id;

  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          featured={featuredIds.has(project.id)}
          lead={project.id === leadId}
        />
      ))}
    </div>
  );
}
