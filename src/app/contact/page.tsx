import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

/**
 * Deliberately no form: a working one needs a `contact_submissions` table, a
 * server action, an email provider key, and spam handling. Until that exists a
 * mailto link actually delivers, where a form that silently drops messages
 * does not.
 */
const EMAIL = "hello@samklep.dev";

const LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/samuel-klepper-0435b5193/",
  },
  { label: "GitHub", href: "https://github.com/samklepdev" },
  { label: "GitLab", href: "https://gitlab.com/bklep" },
];

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
        {/* Green is reserved for status indicators — this is the one place on
            the page that earns it. */}
        <p className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          Available for work
        </p>

        <a className={styles.cta} href={`mailto:${EMAIL}`}>
          {EMAIL}
          <span className={styles.ctaArrow} aria-hidden="true">
            &rarr;
          </span>
        </a>

        <ul className={styles.links}>
          {LINKS.map((link) => (
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
              href="/images/documents/samuel-klepper-resume.pdf"
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
