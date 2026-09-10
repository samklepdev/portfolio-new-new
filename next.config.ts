import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a verification build write somewhere other than `.next`. `next dev` and
  // `next build` share one output directory, so building while a dev server is
  // running deletes the dev server's compiled `layout.css` — every page then
  // 404s the root stylesheet and the whole site renders unstyled, which looks
  // exactly like a CSS regression and is not one. `npm run build:verify` sets
  // this so the two can never collide. Unset, behaviour is stock.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
