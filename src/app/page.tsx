import Link from "next/link";
import { HeroLogoFlight } from "@/components/hero/HeroLogoFlight";
import { HeroSection } from "@/components/hero/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { ClientBand } from "@/components/home/ClientBand";
import { ContactSection } from "@/components/home/ContactSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { getFeaturedProjects } from "@/db/queries";
import styles from "./page.module.css";

export const revalidate = 60;

export default async function Home() {
  const projects = await getFeaturedProjects();

  return (
    <main>
      <HeroSection />
      <HeroLogoFlight />
      <ClientBand />
      <AboutSection />
      <ServicesSection />
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
