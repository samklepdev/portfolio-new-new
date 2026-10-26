"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import styles from "./AdminSidebar.module.css";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

const DashboardIcon = () => (
  <svg {...iconProps}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
);
const ProjectsIcon = () => (
  <svg {...iconProps}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
);
const PostsIcon = () => (
  <svg {...iconProps}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M13 3v6h6" /><path d="M9 13h6M9 17h6" /></svg>
);
const TagsIcon = () => (
  <svg {...iconProps}><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
);
const SubmissionsIcon = () => (
  <svg {...iconProps}><path d="M3 5h18v14H3z" /><path d="M3 7l9 6 9-6" /></svg>
);
const ChevronIcon = () => (
  <svg {...iconProps}><path d="M15 6l-6 6 6 6" /></svg>
);

export const LINKS: ReadonlyArray<{ href: string; label: string; icon: ReactNode }> = [
  { href: "/admin", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/admin/projects", label: "Projects", icon: <ProjectsIcon /> },
  { href: "/admin/posts", label: "Posts", icon: <PostsIcon /> },
  { href: "/admin/tags", label: "Tags", icon: <TagsIcon /> },
  { href: "/admin/submissions", label: "Submissions", icon: <SubmissionsIcon /> },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      id="admin-sidebar"
      className={styles.nav}
      data-collapsed={collapsed}
      aria-label="Admin"
    >
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>SK</span>
        <span className={styles.label}>Admin</span>
      </div>
      <ul className={styles.links}>
        {LINKS.map(({ href, label, icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={styles.link}
              title={collapsed ? label : undefined}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <span className={styles.icon}>{icon}</span>
              <span className={styles.label}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className={styles.spacer} />
      <button
        type="button"
        className={styles.toggle}
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className={styles.toggleIcon} data-collapsed={collapsed}>
          <ChevronIcon />
        </span>
        <span className={styles.label}>Collapse</span>
      </button>
      <div className={styles.logout}>
        <LogoutButton />
      </div>
    </nav>
  );
}
