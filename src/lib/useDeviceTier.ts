import { useEffect, useState } from "react";

export type DeviceTier = "full" | "lite" | "static";

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>("lite"); // safe default before hydration

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setTier("static");
      return;
    }

    const canvas = document.createElement("canvas");
    const hasWebGL = !!(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );

    if (!hasWebGL) {
      setTier("static");
      return;
    }

    const isSmallViewport = window.innerWidth < 768;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    setTier(isSmallViewport || isCoarsePointer ? "lite" : "full");
  }, []);

  return tier;
}
