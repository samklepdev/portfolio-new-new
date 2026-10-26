import AdminShell from "../AdminShell";

// Wraps the authenticated admin pages only. /admin/login lives outside this
// group (directly under admin/layout.tsx), so the sidebar never renders on the
// login screen. The centered content container now lives inside AdminShell.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
