import Link from "next/link";
import { getDashboardStats } from "@/db/admin-dashboard";
import GlobalSearch from "./GlobalSearch";
import styles from "./page.module.css";

// Keep the overview live instead of baking database aggregates into static HTML.
export const dynamic = "force-dynamic";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

const ProjectsIcon = () => (
  <svg {...iconProps}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
);
const PostsIcon = () => (
  <svg {...iconProps}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M13 3v6h6" /><path d="M9 13h6M9 17h6" /></svg>
);
const InquiriesIcon = () => (
  <svg {...iconProps}><path d="M3 5h18v14H3z" /><path d="M3 7l9 6 9-6" /></svg>
);
const EmailIcon = () => (
  <svg {...iconProps}><path d="M22 3 11 14" /><path d="M22 3 15 21l-4-7-7-4z" /></svg>
);

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

  const emailNote = [
    stats.email.failed > 0 ? "Needs attention" : "No delivery failures",
    stats.email.pending > 0 ? `${stats.email.pending} pending` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <GlobalSearch />
        <div className={styles.headerRow}>
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
        </div>
      </header>

      <section className={styles.metrics} aria-label="Site metrics">
        <article className={styles.metricCard}>
          <span className={styles.metricIcon} aria-hidden="true">
            <ProjectsIcon />
          </span>
          <span className={styles.metricLabel}>Projects</span>
          <div className={styles.metricValueRow}>
            <strong className={styles.metricValue}>{stats.projects.total}</strong>
            <span className={styles.badge}>{stats.projects.published} published</span>
          </div>
          <span className={styles.metricNote}>{stats.projects.draft} drafts in progress</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon} aria-hidden="true">
            <PostsIcon />
          </span>
          <span className={styles.metricLabel}>Posts</span>
          <div className={styles.metricValueRow}>
            <strong className={styles.metricValue}>{stats.posts.total}</strong>
            <span className={styles.badge}>{stats.posts.published} published</span>
          </div>
          <span className={styles.metricNote}>{stats.posts.draft} drafts in progress</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon} aria-hidden="true">
            <InquiriesIcon />
          </span>
          <span className={styles.metricLabel}>New inquiries</span>
          <div className={styles.metricValueRow}>
            <strong className={styles.metricValue}>{stats.submissionsLast30Days}</strong>
          </div>
          <span className={styles.metricNote}>Received in the last 30 days</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon} aria-hidden="true">
            <EmailIcon />
          </span>
          <span className={styles.metricLabel}>Email delivered</span>
          <div className={styles.metricValueRow}>
            <strong className={styles.metricValue}>{stats.email.delivered}</strong>
            {stats.email.failed > 0 && (
              <span
                className={`${styles.badge} ${styles.badgeDanger}`}
                role="status"
                aria-label="Email delivery failures"
              >
                {stats.email.failed} failed
              </span>
            )}
          </div>
          <span className={styles.metricNote}>{emailNote}</span>
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
              <Link href="/admin/themes">Themes <span aria-hidden="true">→</span></Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
