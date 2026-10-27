import { describe, expect, it } from "vitest";
import { paletteToStyle } from "./themeStyle";
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
  isActive: true,
};

describe("paletteToStyle", () => {
  it("returns an empty object for the default (null) theme", () => {
    expect(paletteToStyle(null)).toEqual({});
  });

  it("maps a theme to the six :root custom properties", () => {
    expect(paletteToStyle(theme)).toEqual({
      "--background": "#101010",
      "--foreground": "#fafafa",
      "--neon-turquoise": "#11ccdd",
      "--neon-pink": "#ee3388",
      "--neon-purple": "#9922ee",
      "--neon-green": "#22dd77",
    });
  });
});
