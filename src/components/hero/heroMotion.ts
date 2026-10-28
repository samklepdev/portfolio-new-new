import * as THREE from "three";
import type { HeroPreset } from "@/lib/heroPresets";

export type MotionCtx = {
  elapsed: number;
  delta: number;
  basePositions: Float32Array;
};

// Mutates the points' rotation (and, for wave, its geometry positions) for the
// current frame and returns the ambient scale multiplier (1 unless breathing).
export type HeroMotion = (points: THREE.Points, ctx: MotionCtx) => number;

const orbit: HeroMotion = (points, { delta }) => {
  points.rotation.y += delta * 0.03;
  return 1;
};

const drift: HeroMotion = (points, { delta, elapsed }) => {
  points.rotation.y += delta * 0.01;
  points.rotation.x = Math.sin(elapsed * 0.15) * 0.12;
  return 1;
};

const pulse: HeroMotion = (points, { delta, elapsed }) => {
  points.rotation.y += delta * 0.02;
  return 1 + Math.sin(elapsed * 0.8) * 0.06;
};

const wave: HeroMotion = (points, { delta, elapsed, basePositions }) => {
  points.rotation.y += delta * 0.015;
  const attr = (points.geometry as THREE.BufferGeometry).attributes
    .position as THREE.BufferAttribute;
  const array = attr.array as Float32Array;
  // Displace Z from the pristine base so the ripple never accumulates.
  for (let i = 0; i < array.length; i += 3) {
    array[i + 2] = basePositions[i + 2] + Math.sin(basePositions[i] * 0.6 + elapsed * 1.2) * 0.25;
  }
  attr.needsUpdate = true;
  return 1;
};

const MOTIONS: Record<HeroPreset, HeroMotion> = { orbit, drift, pulse, wave };

export function resolveHeroMotion(name: string): HeroMotion {
  return MOTIONS[name as HeroPreset] ?? orbit;
}
