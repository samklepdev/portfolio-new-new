import { describe, expect, it } from "vitest";
import { parseId, parseProjectInput, parsePostInput, parseTagInput, parseThemeInput } from "./validateAdmin";

describe("parseId", () => {
  it("accepts positive integers", () => {
    expect(parseId("7")).toBe(7);
  });
  it("rejects non-numeric, zero, negative, and float ids", () => {
    expect(parseId("abc")).toBeNull();
    expect(parseId("0")).toBeNull();
    expect(parseId("-3")).toBeNull();
    expect(parseId("1.5")).toBeNull();
    expect(parseId("")).toBeNull();
  });
});

describe("parseProjectInput", () => {
  const base = { slug: "demo", title: "Demo", summary: "A demo project" };

  it("accepts a minimal body and fills defaults", () => {
    const r = parseProjectInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.slug).toBe("demo");
      expect(r.value.status).toBe("published");
      expect(r.value.featured).toBe(false);
      expect(r.value.sortOrder).toBe(0);
      expect(r.value.tech).toEqual([]);
      expect(r.value.content).toBeNull();
    }
  });

  it("rejects a missing title", () => {
    const r = parseProjectInput({ slug: "x", summary: "y" });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("title") });
  });

  it("rejects a bad slug", () => {
    const r = parseProjectInput({ ...base, slug: "Bad Slug!" });
    expect(r.ok).toBe(false);
  });

  it("parses the tech array, dropping entries without a name", () => {
    const r = parseProjectInput({ ...base, tech: [{ name: "Next", iconUrl: "/n.svg" }, { iconUrl: "/x" }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.tech).toEqual([{ name: "Next", iconUrl: "/n.svg" }]);
  });

  it("rejects a non-object body", () => {
    expect(parseProjectInput(null).ok).toBe(false);
    expect(parseProjectInput("nope").ok).toBe(false);
  });
});

describe("parsePostInput", () => {
  it("accepts a minimal body and coerces tags to strings", () => {
    const r = parsePostInput({ slug: "p", title: "P", excerpt: "e", tags: ["a", 2, null] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.tags).toEqual(["a"]);
  });
  it("rejects a missing excerpt", () => {
    expect(parsePostInput({ slug: "p", title: "P" }).ok).toBe(false);
  });
});

describe("parseTagInput", () => {
  it("accepts name + kind", () => {
    const r = parseTagInput({ name: "React", kind: "tech", iconUrl: "/r.svg" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.kind).toBe("tech");
  });
  it("rejects an unknown kind", () => {
    expect(parseTagInput({ name: "x", kind: "bogus" }).ok).toBe(false);
  });
  it("rejects a missing name", () => {
    expect(parseTagInput({ kind: "tech" }).ok).toBe(false);
  });
});

describe("parseThemeInput", () => {
  const base = {
    name: "Vapor",
    background: "#0b0e14",
    foreground: "#ffffff",
    turquoise: "#00f0ff",
    pink: "#ff2e97",
    purple: "#b026ff",
    green: "#39ff88",
  };

  it("accepts and echoes a valid hero preset", () => {
    const result = parseThemeInput({ ...base, heroPreset: "pulse" });
    expect(result).toEqual({ ok: true, value: expect.objectContaining({ heroPreset: "pulse" }) });
  });

  it("defaults heroPreset to orbit when absent", () => {
    const result = parseThemeInput(base);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.heroPreset).toBe("orbit");
  });

  it("rejects an unknown hero preset", () => {
    const result = parseThemeInput({ ...base, heroPreset: "spin" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/hero preset/i);
  });
});
