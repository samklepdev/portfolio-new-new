// Shared client-side theme helpers for the front-end switcher. The pre-hydration
// inline script (themeBoot.ts) applies the saved theme before paint; these run
// at React runtime when a visitor switches.
export const THEME_STORAGE_KEY = "portfolio-theme";

export function applyThemeStyle(el: HTMLElement, style: Record<string, string>): void {
  for (const [prop, value] of Object.entries(style)) {
    el.style.setProperty(prop, value);
  }
}

export function storeThemeId(id: number): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, String(id));
  } catch {
    // storage unavailable (private mode / disabled) — non-fatal
  }
}

export function readStoredThemeId(): number | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
  } catch {
    return null;
  }
}
