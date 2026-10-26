import AdminNav from "../AdminNav";
import styles from "./layout.module.css";

// Wraps the authenticated admin pages only. /admin/login lives outside this
// group (directly under admin/layout.tsx), so the nav + sign-out never render
// on the login screen.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      <div className={styles.content}>{children}</div>
    </>
  );
}
