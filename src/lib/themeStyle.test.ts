import { describe, expect, it } from "vitest";
import { themeToStyle, toPublicTheme } from "./themeStyle";
import type { ThemeRowDTO } from "@/services/types";

const theme: ThemeRowDTO = {
  id: 1,
  name: "Sunset",
  background: "#101010",
  foreground: "#fafafa",
  turquoise: "#11ccdd",
  pink: "#ee3388",
  purple: "#9922ee",
  green: "#22dd77",
  heroPreset: "pulse",
  isActive: true,
};

describe("themeToStyle", () => {
  it("returns an empty object for the default (null) theme", () => {
    expect(themeToStyle(null)).toEqual({});
  });

  it("maps a theme to the six :root custom properties plus the hero preset", () => {
    expect(themeToStyle(theme)).toEqual({
      "--background": "#101010",
      "--foreground": "#fafafa",
      "--neon-turquoise": "#11ccdd",
      "--neon-pink": "#ee3388",
      "--neon-purple": "#9922ee",
      "--neon-green": "#22dd77",
      "--hero-preset": "pulse",
    });
  });
});

describe("toPublicTheme", () => {
  it("maps a theme row to a public DTO with a precomputed style map", () => {
    const result = toPublicTheme({
      id: 2, name: "Ember", isActive: false, heroPreset: "pulse",
      background: "#140b0a", foreground: "#fff4ec", turquoise: "#ff7a18",
      pink: "#ff2e63", purple: "#b5179e", green: "#4ade80",
    });
    expect(result).toEqual({
      id: 2,
      name: "Ember",
      isActive: false,
      style: {
        "--background": "#140b0a",
        "--foreground": "#fff4ec",
        "--neon-turquoise": "#ff7a18",
        "--neon-pink": "#ff2e63",
        "--neon-purple": "#b5179e",
        "--neon-green": "#4ade80",
        "--hero-preset": "pulse",
      },
    });
  });
});
