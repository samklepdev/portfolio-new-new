"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import styles from "./AdminShell.module.css";

const STORAGE_KEY = "admin-sidebar-collapsed";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Read the persisted collapse state after mount so SSR and first render agree.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      /* private mode — keep default */
    }
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Escape closes an open drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className={styles.shell} data-collapsed={collapsed} data-drawer-open={drawerOpen}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-controls="admin-sidebar"
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden focusable="false">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className={styles.topbarBrand}>Admin</span>
      </header>
      <AdminSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      {drawerOpen && (
        <div className={styles.backdrop} onClick={() => setDrawerOpen(false)} aria-hidden />
      )}
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
