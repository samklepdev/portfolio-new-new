import type { Metadata } from "next";
import AdminNav from "./AdminNav";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Admin — Sam Klepper",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <AdminNav />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
