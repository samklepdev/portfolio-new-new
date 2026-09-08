import Image from "next/image";
import Link from "next/link";
import {
  EMAIL,
  NAV_LINKS,
  RESUME_URL,
  SOCIAL_LINKS,
} from "@/lib/siteLinks";
import { DownloadIcon, SOCIAL_ICONS } from "./icons";
import styles from "./Footer.module.css";

export function Footer() {
  // Evaluated when the page renders — which, for the statically prerendered
  // routes, means build time. /about and /contact will therefore show last
  // year's date after New Year until the site is redeployed. Accepted: the
  // alternatives are hardcoding (always stale) or computing it in the browser,
  // which would make this a client component and ship JS to render a number.
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Sam Klepper — home">
          {/* The "-dark" file is the light-artwork variant, i.e. the one meant
              to sit on a dark background. unoptimized because the optimizer
              refuses SVG without dangerouslyAllowSVG. */}
          <Image
            src="/images/sbk-logo-dark.svg"
            alt=""
            width={52}
            height={38}
            unoptimized
          />
        </Link>

        {/* Labelled because the Header already contributes a navigation
            landmark; two unlabelled ones are indistinguishable to a screen
            reader. */}
        <nav className={styles.nav} aria-label="Footer">
          <ul className={styles.links}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <ul className={styles.links}>
            {SOCIAL_LINKS.map((link) => {
              // Paired by id rather than by label, which is copy and may change.
              const Icon = SOCIAL_ICONS[link.id];
              return (
                <li key={link.href}>
                  <a
                    className={styles.link}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className={styles.icon} />
                    {link.label}
                  </a>
                </li>
              );
            })}
            <li>
              <a className={styles.link} href={RESUME_URL} download>
                <DownloadIcon className={styles.icon} />
                Resume
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className={styles.baseline}>
        <p className={styles.copyright}>
          &copy; {year} SbK. All rights reserved.
        </p>
        <a className={styles.email} href={`mailto:${EMAIL}`}>
          {EMAIL}
        </a>
      </div>
    </footer>
  );
}
