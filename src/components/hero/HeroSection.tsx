"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollStore } from "@/lib/scrollStore";
import { useDeviceTier } from "@/lib/useDeviceTier";
import { HeroStaticFallback } from "./HeroStaticFallback";
import styles from "./HeroSection.module.css";

gsap.registerPlugin(ScrollTrigger);

// WebGL must never block first paint or SEO-relevant content below the fold
const HeroScene = dynamic(
  () => import("./HeroScene").then((mod) => mod.HeroScene),
  { ssr: false }
);

export function HeroSection() {
  const tier = useDeviceTier();
  const containerRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const setProgress = useScrollStore((s) => s.setProgress);
  const setHeroDismissed = useScrollStore((s) => s.setHeroDismissed);

  useEffect(() => {
    if (!containerRef.current || !hudRef.current) return;

    const ctx = gsap.context(() => {
      // matchMedia lets mobile get a shorter, less scrubby scroll distance
      // than desktop, rather than one timeline hand-tuned for one breakpoint.
      // This is gsap.matchMedia, not ScrollTrigger.matchMedia — the latter was
      // removed from GSAP and is undefined in the installed 3.15, which threw
      // here and left the hero with no pin, no scrub and no progress at all.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => buildTimeline(1.15));
      mm.add("(max-width: 767px)", () => buildTimeline(0.75));

      function buildTimeline(scrollDistanceMultiplier: number) {
        const distance = window.innerHeight * scrollDistanceMultiplier;

        // Tells ClientBand it is safe to overlap the hero. Only set once a pin
        // actually exists — without it the band would ride up over a hero that
        // never pinned (JS disabled, or GSAP failing as it did with the removed
        // ScrollTrigger.matchMedia) and cover its lower half.
        document.documentElement.dataset.heroPinned = "true";

        return gsap.timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: `+=${distance}`,
            scrub: 0.6,
            pin: true,
            onUpdate: (self) => {
              setProgress(self.progress);
              // Deliberately well before the end: the bar needs to be sliding
              // down while the logo is still in flight, so the logo arrives
              // into it rather than after it.
              if (self.progress >= 0.7) setHeroDismissed(true);
              else if (self.progress < 0.7) setHeroDismissed(false);
            },
          },
        }).to(hudRef.current, {
          opacity: 0,
          y: -40,
          ease: "power1.out",
        });
      }
    }, containerRef);

    return () => {
      delete document.documentElement.dataset.heroPinned;
      ctx.revert();
    };
  }, [setProgress, setHeroDismissed]);

  return (
    <section ref={containerRef} className={styles.hero}>
      {tier === "static" ? (
        <HeroStaticFallback />
      ) : (
        <div className={styles.canvasLayer}>
          <HeroScene tier={tier} />
        </div>
      )}

      <div ref={hudRef} className={styles.hud}>
        <p className={styles.status}>status: online</p>
        <h1 className={styles.name}>Sam Klepper</h1>
        <p className={styles.tagline}>
          Full-stack engineer building things in TypeScript, React, and C#.
        </p>
      </div>
    </section>
  );
}
