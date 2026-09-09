import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL, RESUME_URL, SOCIAL_LINKS } from "@/lib/siteLinks";
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Contact — Sam Klepper",
  description: "Get in touch with Sam Klepper — full-stack developer.",
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>
      <h1 className={styles.heading}>Contact</h1>
      <p className={styles.intro}>
        Have a project in mind, or just want to talk shop? The fastest way to
        reach me is email &mdash; I read everything and reply to what I can.
      </p>

      <div className={styles.panel}>
        <AvailabilityStatus className={styles.status} />

        <a className={styles.cta} href={`mailto:${EMAIL}`}>
          {EMAIL}
          <span className={styles.ctaArrow} aria-hidden="true">
            &rarr;
          </span>
        </a>

        <ul className={styles.links}>
          {SOCIAL_LINKS.map((link) => (
            <li key={link.href}>
              <a
                className={styles.link}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              className={styles.link}
              href={RESUME_URL}
              download
            >
              Resume
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}
