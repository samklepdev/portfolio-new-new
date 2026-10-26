import { getDashboardStats } from "@/db/admin-dashboard";
import styles from "./page.module.css";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className={styles.heading}>Dashboard</h1>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Content</h2>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.projects.total}</span> projects
            {stats.projects.draft > 0 && (
              <span className={styles.sub}>
                {stats.projects.draft} draft{stats.projects.draft === 1 ? "" : "s"}
              </span>
            )}
          </p>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.posts.total}</span> posts
            {stats.posts.draft > 0 && (
              <span className={styles.sub}>
                {stats.posts.draft} draft{stats.posts.draft === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Recent submissions</h2>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.submissionsLast30Days}</span> in the last 30 days
          </p>
          <ul className={styles.list}>
            {stats.recentSubmissions.map((s) => (
              <li key={s.id} className={styles.listItem}>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.meta}>
                  {s.email} · {dateFmt.format(s.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Email delivery</h2>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.email.delivered}</span> delivered
          </p>
          {stats.email.failed > 0 ? (
            <p className={styles.alert} role="status" aria-label="Email delivery failures">
              {stats.email.failed} failed
            </p>
          ) : (
            <p className={styles.sub}>No failures</p>
          )}
          {stats.email.pending > 0 && (
            <p className={styles.sub}>{stats.email.pending} pending</p>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Tag distribution</h2>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.tags.tech}</span> tech
          </p>
          <p className={styles.stat}>
            <span className={styles.big}>{stats.tags.topic}</span> topic
          </p>
        </section>
      </div>
    </div>
  );
}
