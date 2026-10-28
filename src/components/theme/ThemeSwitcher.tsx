"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicTheme } from "@/services/types";
import { applyThemeStyle, storeThemeId, readStoredThemeId } from "@/lib/themeApply";
import styles from "./ThemeSwitcher.module.css";

export function ThemeSwitcher({ themes }: { themes: PublicTheme[] }) {
  const defaultId = (themes.find((t) => t.isActive) ?? themes[0])?.id ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(defaultId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Reconcile to the stored choice after mount — never read storage during render.
  useEffect(() => {
    const stored = readStoredThemeId();
    if (stored !== null && themes.some((t) => t.id === stored)) {
      setSelectedId(stored);
    }
  }, [themes]);

  // Close on outside click or Escape while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (themes.length === 0) return null;

  function pick(theme: PublicTheme) {
    applyThemeStyle(document.documentElement, theme.style);
    storeThemeId(theme.id);
    setSelectedId(theme.id);
    setOpen(false);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change theme"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="8.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <div className={styles.menu} role="listbox" aria-label="Theme">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              role="option"
              aria-selected={theme.id === selectedId}
              className={styles.option}
              onClick={() => pick(theme)}
            >
              <span className={styles.swatches} aria-hidden="true">
                <span style={{ background: theme.style["--neon-turquoise"] }} />
                <span style={{ background: theme.style["--neon-pink"] }} />
                <span style={{ background: theme.style["--neon-purple"] }} />
              </span>
              <span className={styles.name}>{theme.name}</span>
              {theme.id === selectedId && <span className={styles.check} aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
