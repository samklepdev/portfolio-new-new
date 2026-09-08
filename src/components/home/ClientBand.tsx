import type { CSSProperties } from "react";
import Image from "next/image";
import styles from "./ClientBand.module.css";

type ClientLogo = {
  /** Doubles as alt text — these names appear nowhere else on the page. */
  name: string;
  src: string;
  width: number;
  height: number;
  /**
   * Optical correction, so the marks read as equal weight rather than equal
   * size. Solid masses (badges, the FHA house, BuildOn's slab) carry far more
   * ink at a given height and read as louder, so they are knocked back; hairline
   * marks run unscaled. Tuned by eye against the rendered band, not computed.
   */
  scale?: number;
  /** SVG only: the image optimizer 400s on SVG without dangerouslyAllowSVG. */
  unoptimized?: boolean;
};

/**
 * A hand-ordered list, not a database query. The logo set and the project set
 * disagree in both directions — Melissa Hawkins, PsycTech, and Baylor have logos
 * and no project file, while One Time Close, C-Bit, TicHelper, and Super Chef
 * have projects and no logo — so a `clients` table would mean a migration for
 * twelve static rows that nothing queries, joined on a relationship that is
 * partial either way.
 *
 * Order is chosen so wide wordmarks and square badges alternate rather than
 * clumping into lopsided rows. It is load-bearing: flex-wrap fills greedily, so
 * the sequence decides where the break lands. Grouping the five wide marks first
 * put every badge on row two and left the band a lopsided pyramid (a 919px row
 * over a 527px one); interleaving them evens it to roughly 783 over 713 while
 * still breaking 6/6. Adding a client means inserting where it balances, not
 * appending, and re-checking the break at desktop width.
 */
const CLIENTS: ClientLogo[] = [
  // Knocked back from 1: the boldest wordmark in the set, and the only one that
  // hit the 10rem ceiling. 0.92 both quiets it and drops its natural width under
  // the cap, so it is no longer letterboxed a couple of pixels short.
  {
    name: "BuildOn Technologies",
    src: "/images/logos/buildon-logo.png",
    width: 408,
    height: 100,
    scale: 0.92,
  },
  {
    name: "DeLeon Safety Solutions",
    src: "/images/logos/dss-logo.png",
    width: 400,
    height: 340,
    scale: 0.85,
  },
  {
    name: "PsycTech",
    src: "/images/logos/psyctech-logo.png",
    width: 800,
    height: 254,
  },
  {
    name: "Gulf Winds International",
    src: "/images/logos/gwi-logo.png",
    width: 143,
    height: 142,
    scale: 0.78,
  },
  {
    name: "Ultra Demolition",
    src: "/images/logos/ud.png",
    width: 185,
    height: 111,
  },
  // Stacked hairline serif, not a badge — the 0.85 badge correction was making
  // an already-light mark disappear. Runs unscaled.
  {
    name: "Baylor College of Medicine",
    src: "/images/logos/baylor-logo.png",
    width: 124,
    height: 101,
  },
  {
    name: "Melissa Hawkins Photography",
    src: "/images/logos/mHawk.png",
    width: 259,
    height: 72,
  },
  {
    name: "WealthGuard Insurance Group",
    src: "/images/logos/wig-logo.png",
    width: 184,
    height: 191,
    scale: 0.8,
  },
  // The solid house is the largest unbroken ink mass in the set.
  {
    name: "FHA",
    src: "/images/logos/fha-logo.png",
    width: 360,
    height: 120,
    scale: 0.85,
  },
  {
    name: "Edge196",
    src: "/images/logos/edge196.svg",
    width: 68,
    height: 67,
    scale: 0.78,
    unoptimized: true,
  },
  {
    name: "Becks Prime",
    src: "/images/logos/becks-logo.png",
    width: 191,
    height: 147,
    scale: 0.8,
  },
  // Hairline monogram, the lightest mark here even unscaled.
  {
    name: "Winfield's Chocolate Bar",
    src: "/images/logos/winfields-logo.svg",
    width: 158,
    height: 159,
    unoptimized: true,
  },
];

/**
 * Credibility at a glance, not a second index into the work — the project grid
 * below owns navigation. Deliberately static: a band that moves cannot be
 * scanned in the second a visitor gives it, and logos parked offscreen make the
 * set feel unknowable.
 */
export function ClientBand() {
  return (
    <section className={styles.section} aria-labelledby="clients-heading">
      <h2 id="clients-heading" className={styles.heading}>
        Businesses I&rsquo;ve built for
      </h2>

      <ul className={styles.list}>
        {CLIENTS.map((client) => (
          <li key={client.src} className={styles.item}>
            <Image
              className={styles.logo}
              src={client.src}
              alt={client.name}
              width={client.width}
              height={client.height}
              sizes="(max-width: 639px) 120px, 160px"
              unoptimized={client.unoptimized}
              // Per-logo optical correction, read by .logo in the CSS module.
              // A custom property is not in CSSProperties, hence the cast.
              style={
                client.scale
                  ? ({ "--logo-scale": client.scale } as CSSProperties)
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
