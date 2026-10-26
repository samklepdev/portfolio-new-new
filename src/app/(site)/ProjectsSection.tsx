import Link from "next/link";
import {ProjectGrid} from "@/components/projects/ProjectGrid";
import styles from "./page.module.css";
import {PublishedProject} from "@/db/queries";

export default function ProjectsSection(props: { projects: PublishedProject[] }) {
    return <section className={styles.projects} id="projects">
        <div className={styles.projectsHeader}>
            <h2 className={styles.projectsHeading}>Selected work</h2>
            <Link href="/projects" className={styles.allProjectsLink}>
                All projects <span aria-hidden="true">→</span>
            </Link>
        </div>
        <ProjectGrid projects={props.projects} featureFirst/>
    </section>
}