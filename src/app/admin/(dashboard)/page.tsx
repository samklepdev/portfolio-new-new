import Link from "next/link";
import { getDashboardStats } from "@/db/admin-dashboard";
import styles from "./page.module.css";

// Keep the overview live instead of baking database aggregates into static HTML.
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  const publishedContent = stats.projects.published + stats.posts.published;
  const totalContent = stats.projects.total + stats.posts.total;
  const publishedPercent =
    totalContent === 0 ? 0 : Math.round((publishedContent / totalContent) * 100);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Workspace overview</p>
          <h1 className={styles.heading}>Dashboard</h1>
          <p className={styles.intro}>
            A quick look at your content and incoming messages.
          </p>
        </div>
        <Link className={styles.siteLink} href="/">
          View website <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className={styles.metrics} aria-label="Site metrics">
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Projects</span>
          <strong className={styles.metricValue}>{stats.projects.total}</strong>
          <span className={styles.metricNote}>
            {stats.projects.published} published · {stats.projects.draft} drafts
          </span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Posts</span>
          <strong className={styles.metricValue}>{stats.posts.total}</strong>
          <span className={styles.metricNote}>
            {stats.posts.published} published · {stats.posts.draft} drafts
          </span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>New inquiries</span>
          <strong className={styles.metricValue}>{stats.submissionsLast30Days}</strong>
          <span className={styles.metricNote}>Received in the last 30 days</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Email delivered</span>
          <strong className={styles.metricValue}>{stats.email.delivered}</strong>
          <span className={styles.metricNote}>
            {stats.email.failed > 0 ? (
              <span
                className={styles.failure}
                role="status"
                aria-label="Email delivery failures"
              >
                {stats.email.failed} failed
              </span>
            ) : (
              "No delivery failures"
            )}
            {stats.email.pending > 0 ? ` · ${stats.email.pending} pending` : ""}
          </span>
        </article>
      </section>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Recent inquiries</h2>
              <p className={styles.panelDescription}>The latest messages from your contact form.</p>
            </div>
            <Link className={styles.panelLink} href="/admin/submissions">
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>

          {stats.recentSubmissions.length > 0 ? (
            <ul className={styles.inquiryList}>
              {stats.recentSubmissions.map((submission) => (
                <li className={styles.inquiry} key={submission.id}>
                  <span className={styles.avatar} aria-hidden="true">
                    {initials(submission.name)}
                  </span>
                  <span className={styles.inquiryDetails}>
                    <span className={styles.inquiryName}>{submission.name}</span>
                    <span className={styles.inquiryEmail}>{submission.email}</span>
                  </span>
                  <time className={styles.inquiryDate} dateTime={submission.createdAt.toISOString()}>
                    {dateFmt.format(submission.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>No inquiries yet. New messages will appear here.</p>
          )}
        </section>

        <aside className={styles.sidePanels}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Publishing</h2>
            <p className={styles.panelDescription}>
              Published content across projects and posts.
            </p>
            <div className={styles.progressHeader}>
              <span>{publishedContent} of {totalContent} published</span>
              <strong>{publishedPercent}%</strong>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Published content"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={publishedPercent}
            >
              <span className={styles.progressFill} style={{ width: `${publishedPercent}%` }} />
            </div>
            <div className={styles.tagSummary}>
              <span>Tech tags <strong>{stats.tags.tech}</strong></span>
              <span>Topic tags <strong>{stats.tags.topic}</strong></span>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Manage content</h2>
            <div className={styles.quickLinks}>
              <Link href="/admin/projects">Projects <span aria-hidden="true">→</span></Link>
              <Link href="/admin/posts">Posts <span aria-hidden="true">→</span></Link>
              <Link href="/admin/tags">Tags <span aria-hidden="true">→</span></Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
