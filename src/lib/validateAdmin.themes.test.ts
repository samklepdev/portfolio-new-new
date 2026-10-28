import { describe, expect, it } from "vitest";
import { parseThemeInput } from "./validateAdmin";

const valid = {
  name: "Sunset",
  background: "#0b0e14",
  foreground: "#ffffff",
  turquoise: "#00f0ff",
  pink: "#ff2e97",
  purple: "#b026ff",
  green: "#39ff88",
};

describe("parseThemeInput", () => {
  it("accepts a valid payload and trims the name", () => {
    const result = parseThemeInput({ ...valid, name: "  Sunset  " });
    expect(result).toEqual({
      ok: true,
      value: { ...valid, name: "Sunset", heroPreset: "orbit", isPublic: false },
    });
  });

  it("accepts both #rgb and #rrggbb hex", () => {
    expect(parseThemeInput({ ...valid, turquoise: "#abc" }).ok).toBe(true);
    expect(parseThemeInput({ ...valid, turquoise: "#AABBCC" }).ok).toBe(true);
  });

  it("rejects a non-object body", () => {
    expect(parseThemeInput("nope")).toEqual({ ok: false, error: "Body must be an object" });
  });

  it("rejects an empty name", () => {
    const result = parseThemeInput({ ...valid, name: "   " });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid hex colour with a field-specific message", () => {
    for (const bad of ["red", "#12", "#1234", "00f0ff", "#gggggg"]) {
      const result = parseThemeInput({ ...valid, pink: bad });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/pink/);
    }
  });

  it("rejects a missing colour field", () => {
    const { green, ...withoutGreen } = valid;
    void green;
    expect(parseThemeInput(withoutGreen).ok).toBe(false);
  });
});

describe("parseThemeInput isPublic", () => {
  const base = {
    name: "Vapor",
    background: "#0b0e14", foreground: "#ffffff", turquoise: "#00f0ff",
    pink: "#ff2e97", purple: "#b026ff", green: "#39ff88",
  };

  it("accepts isPublic: true", () => {
    const r = parseThemeInput({ ...base, isPublic: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.isPublic).toBe(true);
  });

  it("defaults isPublic to false when absent", () => {
    const r = parseThemeInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.isPublic).toBe(false);
  });

  it("coerces a non-boolean isPublic to false", () => {
    const r = parseThemeInput({ ...base, isPublic: "yes" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.isPublic).toBe(false);
  });
});
