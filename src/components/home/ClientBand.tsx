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
   * Optical correction. At equal height a square badge carries far more ink
   * than a wordmark and reads as louder, so the square marks are knocked back.
   * Tuned by eye against the rendered band, not computed.
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
 * clumping into lopsided rows. Adding a client means inserting where it balances,
 * not appending.
 */
const CLIENTS: ClientLogo[] = [
  {
    name: "BuildOn Technologies",
    src: "/images/logos/buildon-logo.png",
    width: 408,
    height: 100,
  },
  {
    name: "FHA",
    src: "/images/logos/fha-logo.png",
    width: 360,
    height: 120,
  },
  {
    name: "DeLeon Safety Solutions",
    src: "/images/logos/dss-logo.png",
    width: 400,
    height: 340,
    scale: 0.85,
  },
  {
    name: "Baylor College of Medicine",
    src: "/images/logos/baylor-logo.png",
    width: 124,
    height: 101,
    scale: 0.85,
  },
  {
    name: "PsycTech",
    src: "/images/logos/psyctech-logo.png",
    width: 800,
    height: 254,
  },
  {
    name: "Melissa Hawkins Photography",
    src: "/images/logos/mHawk.png",
    width: 259,
    height: 72,
  },
  {
    name: "Winfield's Chocolate Bar",
    src: "/images/logos/winfields-logo.svg",
    width: 158,
    height: 159,
    scale: 0.85,
    unoptimized: true,
  },
  {
    name: "Ultra Demolition",
    src: "/images/logos/ud.png",
    width: 185,
    height: 111,
  },
  {
    name: "Gulf Winds International",
    src: "/images/logos/gwi-logo.png",
    width: 143,
    height: 142,
    scale: 0.85,
  },
  {
    name: "WealthGuard Insurance Group",
    src: "/images/logos/wig-logo.png",
    width: 184,
    height: 191,
    scale: 0.85,
  },
  {
    name: "Becks Prime",
    src: "/images/logos/becks-logo.png",
    width: 191,
    height: 147,
    scale: 0.85,
  },
  {
    name: "Edge196",
    src: "/images/logos/edge196.svg",
    width: 68,
    height: 67,
    scale: 0.85,
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
