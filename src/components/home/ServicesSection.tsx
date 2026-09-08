import styles from "./ServicesSection.module.css";
import { RingField } from "./RingField";

const SERVICES = [
  {
    title: "Design & build",
    body: "Marketing sites taken from first wireframe to launch — responsive, fast, and structured so the people already searching for you actually land on you.",
  },
  {
    title: "Custom applications",
    body: "Dashboards, portals, and internal tools. The software that runs a business day to day, not just the site that describes it.",
  },
];

export function ServicesSection() {
  return (
    <section
      className={styles.section}
      id="services"
      aria-labelledby="services-heading"
    >
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Services</p>
        <h2 id="services-heading" className={styles.heading}>
          What I build
        </h2>

        <ul className={styles.grid}>
          {SERVICES.map((service) => (
            <li key={service.title} className={styles.card}>
              <div className={styles.graphic}>
                <RingField />
              </div>
              <div className={styles.body}>
                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardText}>{service.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
