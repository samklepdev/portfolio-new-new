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
      // than desktop, rather than one timeline hand-tuned for one breakpoint
      ScrollTrigger.matchMedia({
        "(min-width: 768px)": () => buildTimeline(1.2),
        "(max-width: 767px)": () => buildTimeline(0.7),
      });

      function buildTimeline(scrollDistanceMultiplier: number) {
        const distance = window.innerHeight * scrollDistanceMultiplier;

        return gsap.timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: `+=${distance}`,
            scrub: 0.6,
            pin: true,
            onUpdate: (self) => {
              setProgress(self.progress);
              if (self.progress >= 0.98) setHeroDismissed(true);
              else if (self.progress < 0.98) setHeroDismissed(false);
            },
          },
        }).to(hudRef.current, {
          opacity: 0,
          y: -40,
          ease: "power1.out",
        });
      }
    }, containerRef);

    return () => ctx.revert();
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
