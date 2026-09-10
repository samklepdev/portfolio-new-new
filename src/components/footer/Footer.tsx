import Link from "next/link";
import { SbkLogo } from "@/components/brand/SbkLogo";
import {
  CONTACT_EMAIL,
  NAV_LINKS,
  RESUME_URL,
  SOCIAL_LINKS,
} from "@/lib/siteLinks";
import { DownloadIcon, SOCIAL_ICONS } from "./icons";
import styles from "./Footer.module.css";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} aria-label="Sam Klepper — home">
            <SbkLogo width={52} height={38} />
          </Link>

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

            <ul className={styles.iconLinks}>
              {SOCIAL_LINKS.map((link) => {
                const Icon = SOCIAL_ICONS[link.id];
                return (
                  <li key={link.href}>
                    <a
                      className={styles.iconLink}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon className={styles.icon} />
                      <span className={styles.srOnly}>{link.label}</span>
                    </a>
                  </li>
                );
              })}
              <li>
                <a className={styles.iconLink} href={RESUME_URL} download>
                  <DownloadIcon className={styles.icon} />
                  <span className={styles.srOnly}>Resume</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className={styles.baseline}>
          <p className={styles.copyright}>
            &copy; {year} SbK. All rights reserved.
          </p>
          <a className={styles.email} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
