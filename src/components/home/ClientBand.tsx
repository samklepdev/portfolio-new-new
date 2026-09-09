import type { CSSProperties } from "react";
import Image from "next/image";
import styles from "./ClientBand.module.css";

type ClientLogo = {
  name: string;
  src: string;
  width: number;
  height: number;
  scale?: number;
  unoptimized?: boolean;
};

const CLIENTS: ClientLogo[] = [
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
  {
    name: "Winfield's Chocolate Bar",
    src: "/images/logos/winfields-logo.svg",
    width: 158,
    height: 159,
    unoptimized: true,
  },
];

export function ClientBand() {
  return (
    <div className={styles.riser}>
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
    </div>
  );
}
