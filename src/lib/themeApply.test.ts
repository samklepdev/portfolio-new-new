import { describe, it, expect, beforeEach } from "vitest";
import { THEME_STORAGE_KEY, applyThemeStyle, storeThemeId, readStoredThemeId } from "./themeApply";

beforeEach(() => {
  window.localStorage.clear();
});

describe("applyThemeStyle", () => {
  it("sets every custom property on the element", () => {
    const el = document.createElement("div");
    applyThemeStyle(el, { "--background": "#140b0a", "--neon-turquoise": "#ff7a18" });
    expect(el.style.getPropertyValue("--background")).toBe("#140b0a");
    expect(el.style.getPropertyValue("--neon-turquoise")).toBe("#ff7a18");
  });
});

describe("storeThemeId / readStoredThemeId", () => {
  it("round-trips a numeric id", () => {
    storeThemeId(3);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("3");
    expect(readStoredThemeId()).toBe(3);
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredThemeId()).toBeNull();
  });

  it("returns null for a non-numeric stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "abc");
    expect(readStoredThemeId()).toBeNull();
  });
});
