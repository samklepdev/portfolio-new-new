"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { useScrollStore } from "@/lib/scrollStore";
import type { DeviceTier } from "@/lib/useDeviceTier";

const NEON_TURQUOISE = "#00F0FF";
const NEON_PINK = "#FF2E97";
const NEON_PURPLE = "#B026FF";

function ParticleField({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color(NEON_TURQUOISE),
      new THREE.Color(NEON_PINK),
      new THREE.Color(NEON_PURPLE),
    ];

    for (let i = 0; i < count; i++) {
      const radius = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // turquoise dominant, pink/purple as sparse accents
      const color = Math.random() < 0.75 ? palette[0] : palette[Math.random() < 0.5 ? 1 : 2];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    // ambient rotation, independent of scroll
    pointsRef.current.rotation.y += delta * 0.03;

    // scroll-driven: field disperses outward and fades as progress -> 1
    const progress = useScrollStore.getState().progress;
    const scale = 1 + progress * 2.2;
    pointsRef.current.scale.setScalar(scale);

    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, 1 - progress * 1.4);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function CameraRig() {
  useFrame(({ camera }) => {
    const progress = useScrollStore.getState().progress;
    // subtle push-in as user scrolls, sells the "receding into depth" feel
    camera.position.z = 10 - progress * 2;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function HeroScene({ tier }: { tier: DeviceTier }) {
  const particleCount = tier === "full" ? 2500 : 800;
  const enableBloom = tier === "full";

  return (
    <Canvas
      dpr={[1, Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1)]}
      camera={{ position: [0, 0, 10], fov: 50 }}
      gl={{ antialias: tier === "full", alpha: true }}
    >
      <ParticleField count={particleCount} />
      <CameraRig />
      {enableBloom && (
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.2} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
