import { describe, expect, it } from "vitest";
import { HERO_PRESETS, DEFAULT_HERO_PRESET, HERO_PRESET_LABELS } from "./heroPresets";

describe("heroPresets", () => {
  it("lists exactly the four presets with orbit first", () => {
    expect(HERO_PRESETS).toEqual(["orbit", "drift", "pulse", "wave"]);
  });

  it("defaults to orbit", () => {
    expect(DEFAULT_HERO_PRESET).toBe("orbit");
    expect(HERO_PRESETS).toContain(DEFAULT_HERO_PRESET);
  });

  it("has a human label for every preset", () => {
    for (const preset of HERO_PRESETS) {
      expect(HERO_PRESET_LABELS[preset]).toBeTruthy();
    }
  });
});
