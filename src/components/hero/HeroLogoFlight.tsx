"use client";

import { useEffect, useRef, useState } from "react";
import { SbkLogo } from "@/components/brand/SbkLogo";
import { useScrollStore } from "@/lib/scrollStore";
import styles from "./HeroLogoFlight.module.css";

const HERO_WIDTH = 160;
const HERO_HEIGHT = 117;
const HEADER_WIDTH = 44;

const FADE_IN_START = 0.1;
const FADE_IN_END = 0.22;
const PULSE_AT = 0.26;
const FLIGHT_START = 0.3;
// Where the logo arrives on the header's slot. The header's own logo unhides at
// this point, and the flight lingers to HIDE_AT so the swap never leaves a gap —
// both sit at identical position and size across that overlap, so it is invisible.
const FLIGHT_END = 0.99;
const HIDE_AT = 1;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const range = (value: number, from: number, to: number) =>
  clamp01((value - from) / (to - from));
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/**
 * The logo appears mid-hero, plays the header's hover animation once, then
 * flies into the header's logo slot as the header itself reveals.
 *
 * Rendered as a sibling of HeroSection rather than inside it. ScrollTrigger's
 * pin can put a transform on the pinned element, and a position: fixed child of
 * a transformed ancestor positions against that ancestor instead of the
 * viewport — which would silently break the flight.
 */
export function HeroLogoFlight() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(false);
  const setLogoLanded = useScrollStore((state) => state.setLogoLanded);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      // No flight, so nothing will ever land — the header must not sit there
      // with an empty logo slot forever.
      setLogoLanded(true);
      return;
    }

    // Where the header's own logo will sit once the header is visible. The bar
    // is translateY(-100%) while hidden, so its own rect is off-screen —
    // measuring the logo's offset *within* the bar is transform-independent.
    let target = { x: 0, y: 0 };

    const measure = () => {
      const bar = document.querySelector("header");
      const headerLogo = bar?.querySelector("a svg");
      if (!bar || !headerLogo) return;

      const barRect = bar.getBoundingClientRect();
      const logoRect = headerLogo.getBoundingClientRect();
      target = {
        x: logoRect.left - barRect.left,
        y: logoRect.top - barRect.top,
      };
    };

    measure();

    const apply = (progress: number) => {
      const appear = range(progress, FADE_IN_START, FADE_IN_END);
      const flight = easeInOut(range(progress, FLIGHT_START, FLIGHT_END));

      if (progress < FADE_IN_START || progress >= HIDE_AT) {
        wrapper.style.opacity = "0";
        wrapper.style.visibility = "hidden";
        return;
      }

      wrapper.style.visibility = "visible";
      wrapper.style.opacity = String(appear);

      const startX = window.innerWidth / 2 - HERO_WIDTH / 2;
      const startY = window.innerHeight / 2 - HERO_HEIGHT / 2;
      const scale = 1 - (1 - HEADER_WIDTH / HERO_WIDTH) * flight;

      // Interpolate the top-left, then scale about the top-left so the box the
      // logo occupies lands exactly on the header logo's rect.
      const x = startX + (target.x - startX) * flight;
      const y = startY + (target.y - startY) * flight;

      wrapper.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    };

    apply(useScrollStore.getState().progress);

    // Subscribed imperatively, not through the hook: progress updates on every
    // scroll tick and a hook subscription would re-render this tree each time.
    // Only written when it actually flips. Calling a store setter on every tick
    // from inside the store's own subscriber re-enters the notification loop and
    // blows the stack, which silently kills every other subscriber with it.
    let landed = useScrollStore.getState().logoLanded;

    const unsubscribe = useScrollStore.subscribe((state) => {
      apply(state.progress);
      setPulse((current) => {
        const shouldPulse = state.progress >= PULSE_AT;
        return current === shouldPulse ? current : shouldPulse;
      });

      const hasLanded = state.progress >= FLIGHT_END;
      if (hasLanded !== landed) {
        landed = hasLanded;
        setLogoLanded(hasLanded);
      }
    });

    window.addEventListener("resize", measure);
    return () => {
      unsubscribe();
      window.removeEventListener("resize", measure);
    };
  }, [setLogoLanded]);

  return (
    <div ref={wrapperRef} className={styles.wrapper} aria-hidden="true">
      <SbkLogo width={HERO_WIDTH} height={HERO_HEIGHT} pulse={pulse} />
    </div>
  );
}
