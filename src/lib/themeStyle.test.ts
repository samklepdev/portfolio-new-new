import { describe, expect, it } from "vitest";
import { themeToStyle } from "./themeStyle";
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
