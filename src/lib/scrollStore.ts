import { create } from "zustand";

type ScrollState = {
  progress: number;
  setProgress: (value: number) => void;
  heroDismissed: boolean;
  setHeroDismissed: (value: boolean) => void;
  /** True once the hero's flying logo has reached the header's logo slot. The
   *  header keeps its own logo hidden until then, so the bar slides down empty
   *  and the flight fills it. */
  logoLanded: boolean;
  setLogoLanded: (value: boolean) => void;
};

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  setProgress: (value) => set({ progress: value }),
  heroDismissed: false,
  setHeroDismissed: (value) => set({ heroDismissed: value }),
  logoLanded: false,
  setLogoLanded: (value) => set({ logoLanded: value }),
}));
