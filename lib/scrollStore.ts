import { create } from "zustand";

/**
 * Single source of truth for hero scroll progress.
 * GSAP's ScrollTrigger writes to this on every scroll tick;
 * the R3F scene reads from it in its render loop via useScrollStore.getState()
 * (avoid subscribing with the hook inside useFrame — read imperatively to
 * skip React re-renders on every frame).
 */
type ScrollState = {
  /** 0 = top of page (hero fully visible), 1 = hero fully scrolled past */
  progress: number;
  setProgress: (value: number) => void;
  /** true once the hero has been scrolled past and can safely unmount the canvas */
  heroDismissed: boolean;
  setHeroDismissed: (value: boolean) => void;
};

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  setProgress: (value) => set({ progress: value }),
  heroDismissed: false,
  setHeroDismissed: (value) => set({ heroDismissed: value }),
}));
