import type { Metadata } from "next";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Admin — Sam Klepper",
  robots: { index: false, follow: false },
};

// The top-level admin layout wraps every /admin route, INCLUDING /admin/login.
// It must stay chrome-free (no nav / sign-out) — the authenticated chrome lives
// on the (dashboard) route group's layout, which does not wrap login.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
