import { HeroSection } from "@/components/hero/HeroSection";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main>
      <HeroSection />

      {/* Project grid renders normally underneath — no 3D cost here,
          this section should stay fast/crawlable regardless of WebGL support */}
      <section className={styles.projects}>
        <h2 className={styles.projectsHeading}>Projects</h2>
        {/* ...project grid ... */}
      </section>
    </main>
  );
}
