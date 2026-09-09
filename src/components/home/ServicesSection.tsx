import styles from "./ServicesSection.module.css";
import { DashboardField } from "./DashboardField";
import { RingField } from "./RingField";
import { WireframeField } from "./WireframeField";

const SERVICES = [
  {
    title: "Design & build",
    body: "Marketing sites taken from first wireframe to launch — responsive, fast, and structured so the people already searching for you actually land on you.",
    span: "wide",
    graphic: "wireframe",
  },
  {
    title: "Built with",
    body: "TypeScript and React on the front. C#/.NET or Node behind it. Postgres or SQL Server for the data.",
    span: "narrow",
    graphic: "rings",
  },
  {
    title: "From scope to launch",
    body: "Scope and estimate up front, design you sign off on, then build in visible increments. Working software early, not a reveal at the end.",
    span: "narrow",
    graphic: "rings",
  },
  {
    title: "Custom applications",
    body: "Dashboards, portals, and internal tools. The software that runs a business day to day, not just the site that describes it.",
    span: "wide",
    graphic: "dashboard",
  },
] as const;

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
            <li
              key={service.title}
              className={`${styles.card} ${styles[service.span]}`}
            >
              {/* Every card reserves the slot so titles line up across a row.
                  Only the ring field animates; the other two are static, so the
                  ripple stays the section's one moving element. */}
              <div className={styles.graphic}>
                {service.graphic === "rings" && <RingField />}
                {service.graphic === "wireframe" && <WireframeField />}
                {service.graphic === "dashboard" && <DashboardField />}
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
