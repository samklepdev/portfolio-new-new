import { describe, it, expect, beforeEach } from "vitest";
import { buildThemeBootScript } from "./themeBoot";
import { THEME_STORAGE_KEY } from "./themeApply";

function runScript(src: string) {
  // The script is a self-invoking IIFE string; execute it against jsdom globals.
  new Function(src)();
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("style");
  document.body.innerHTML = `<script id="__themes__" type="application/json">${JSON.stringify([
    { id: 1, name: "CyberPunk", isActive: true, style: { "--background": "#0b0e14", "--neon-turquoise": "#00f0ff" } },
    { id: 2, name: "Ember", isActive: false, style: { "--background": "#140b0a", "--neon-turquoise": "#ff7a18" } },
  ])}</script>`;
});

describe("buildThemeBootScript", () => {
  it("applies the saved theme's vars before paint", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "2");
    runScript(buildThemeBootScript());
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("#140b0a");
    expect(document.documentElement.style.getPropertyValue("--neon-turquoise")).toBe("#ff7a18");
  });

  it("no-ops on an unknown saved id", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "999");
    runScript(buildThemeBootScript());
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("");
  });

  it("no-ops when nothing is stored", () => {
    runScript(buildThemeBootScript());
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("");
  });
});
