// The hero's animation styles. Single source of truth for the valid set,
// shared by the theme validator, the admin form, and the hero motion resolver.
export const HERO_PRESETS = ["orbit", "drift", "pulse", "wave"] as const;

export type HeroPreset = (typeof HERO_PRESETS)[number];

export const DEFAULT_HERO_PRESET: HeroPreset = "orbit";

export const HERO_PRESET_LABELS: Record<HeroPreset, string> = {
  orbit: "Orbit — a slow, steady rotation (the classic look)",
  drift: "Drift — a calm wander with a gentle bob",
  pulse: "Pulse — the field breathes in and out",
  wave: "Wave — a travelling ripple across the particles",
};

export function isHeroPreset(value: unknown): value is HeroPreset {
  return typeof value === "string" && (HERO_PRESETS as readonly string[]).includes(value);
}
