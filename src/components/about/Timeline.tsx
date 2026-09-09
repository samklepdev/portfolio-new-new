import styles from "./Timeline.module.css";

type Role = {
  employer: string;
  title: string;
  dates: string;
  description?: string;
};

const ROLES: readonly Role[] = [
  {
    employer: "BuildOn Technologies",
    title: "Software Engineer",
    dates: "Nov 2025 — Sep 2026",
  },
  {
    employer: "Gulf Winds International",
    title: "Software Engineer",
    dates: "May 2024 — Jun 2025",
  },
  {
    employer: "Bouncing Pixel",
    title: "Software Engineer",
    dates: "Feb 2022 — Apr 2024",
  },
  {
    employer: "WealthGuard Insurance Group",
    title: "Software Engineer",
    dates: "Jul 2021 — Feb 2022",
  },
];

export function Timeline() {
  return (
    <ol className={styles.list} role="list">
      {ROLES.map((role) => (
        <li key={role.employer} className={styles.item}>
          <span className={styles.node} aria-hidden="true" />
          <p className={styles.dates}>{role.dates}</p>
          <h3 className={styles.employer}>{role.employer}</h3>
          <p className={styles.title}>{role.title}</p>
          {role.description ? (
            <p className={styles.description}>{role.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
