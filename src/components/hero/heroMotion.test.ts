import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { resolveHeroMotion } from "./heroMotion";

// A minimal Points-like stub for the transform-only presets.
const stubPoints = () => ({ rotation: { x: 0, y: 0 } }) as unknown as THREE.Points;
const ctx = (elapsed: number) => ({ elapsed, delta: 0.016, basePositions: new Float32Array() });

describe("resolveHeroMotion", () => {
  it("returns a distinct motion for each preset", () => {
    const orbit = resolveHeroMotion("orbit");
    const drift = resolveHeroMotion("drift");
    const pulse = resolveHeroMotion("pulse");
    const wave = resolveHeroMotion("wave");
    expect(new Set([orbit, drift, pulse, wave]).size).toBe(4);
  });

  it("falls back to the orbit motion for empty or unknown names", () => {
    const orbit = resolveHeroMotion("orbit");
    expect(resolveHeroMotion("")).toBe(orbit);
    expect(resolveHeroMotion("nope")).toBe(orbit);
  });

  it("orbit holds ambient scale at 1, pulse breathes away from 1", () => {
    expect(resolveHeroMotion("orbit")(stubPoints(), ctx(0))).toBe(1);
    // elapsed chosen so sin(elapsed * 0.8) === 1
    const peak = Math.PI / 2 / 0.8;
    expect(resolveHeroMotion("pulse")(stubPoints(), ctx(peak))).toBeGreaterThan(1);
  });
});
