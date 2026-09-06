import { HeroSection } from "@/components/hero/HeroSection";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { getPublishedProjects } from "@/db/queries";
import styles from "./page.module.css";

// Re-render at most once a minute, so edits made directly in Postgres appear
// without a redeploy. The page stays cached and statically served between
// revalidations — the alternative, force-dynamic, would query the database on
// every request for content that changes a few times a year.
export const revalidate = 60;

export default async function Home() {
  const projects = await getPublishedProjects();

  return (
    <main>
      <HeroSection />

      {/* Project grid renders normally underneath — no 3D cost here,
          this section should stay fast/crawlable regardless of WebGL support */}
      <section className={styles.projects} id="projects">
        <h2 className={styles.projectsHeading}>Projects</h2>
        <ProjectGrid projects={projects} />
      </section>
    </main>
  );
}
