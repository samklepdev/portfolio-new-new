import Link from "next/link";
import { HeroSection } from "@/components/hero/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { ClientBand } from "@/components/home/ClientBand";
import { ContactSection } from "@/components/home/ContactSection";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { getFeaturedProjects } from "@/db/queries";
import styles from "./page.module.css";

// Re-render at most once a minute, so edits made directly in Postgres appear
// without a redeploy. The page stays cached and statically served between
// revalidations — the alternative, force-dynamic, would query the database on
// every request for content that changes a few times a year.
export const revalidate = 60;

export default async function Home() {
  // Home shows the featured work only; /projects carries the full list.
  const projects = await getFeaturedProjects();

  return (
    <main>
      <HeroSection />

      {/* Proof first, before any claims are made: who trusted me, then who I
          am, then the work. */}
      <ClientBand />

      <AboutSection />

      {/* Project grid renders normally underneath — no 3D cost here,
          this section should stay fast/crawlable regardless of WebGL support */}
      <section className={styles.projects} id="projects">
        <div className={styles.projectsHeader}>
          <h2 className={styles.projectsHeading}>Selected work</h2>
          <Link href="/projects" className={styles.allProjectsLink}>
            All projects <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ProjectGrid projects={projects} featureFirst />
      </section>

      <ContactSection />
    </main>
  );
}
