import type { ThemeRowDTO } from "@/services/types";

/**
 * CSS custom properties for a theme, keyed to match globals.css :root. An empty
 * object for the built-in default (null), so globals.css values apply unchanged.
 * Spread onto the <html> element's inline style, which beats any stylesheet
 * :root rule regardless of load order — no flash, no ordering fragility.
 */
export function paletteToStyle(theme: ThemeRowDTO | null): Record<string, string> {
  if (!theme) return {};
  return {
    "--background": theme.background,
    "--foreground": theme.foreground,
    "--neon-turquoise": theme.turquoise,
    "--neon-pink": theme.pink,
    "--neon-purple": theme.purple,
    "--neon-green": theme.green,
  };
}
