import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Testimonials } from "@/components/about/Testimonials";
import { TechStack } from "@/components/about/TechStack";
import { Timeline } from "@/components/about/Timeline";
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
import { RESUME_URL, SOCIAL_LINKS } from "@/lib/siteLinks";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About — Sam Klepper",
  description:
    "Software engineer in Houston, TX — TypeScript, React, and C#. Five years building sites and applications for small businesses.",
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>
      <h1 className={styles.heading}>About</h1>

      <div className={styles.inner}>
        <aside className={styles.rail}>
          <div className={styles.portrait}>
            <Image
              src="/images/sam3-cr.jpg"
              alt="Sam Klepper"
              fill
              className={styles.portraitImage}
              sizes="(min-width: 900px) 18rem, 70vw"
            />
          </div>

          <p className={styles.name}>Sam Klepper</p>
          <p className={styles.role}>Software Engineer</p>

          <AvailabilityStatus className={styles.status} />

          <div className={styles.actions}>
            <a
              className={styles.resume}
              href={RESUME_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Resume
            </a>
            <Link className={styles.contact} href="/contact">
              Contact
            </Link>
          </div>

          <ul className={styles.socials} role="list">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  className={styles.social}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.body}>
          <section className={styles.block}>
            <h2 className={styles.subheading}>Background</h2>
            <p className={styles.copy}>
              I&rsquo;m a developer in Houston, TX. I started out chasing a
              graphic design degree and found software somewhere along the way
              &mdash; the part I liked was never the picture, it was making the
              thing work.
            </p>
            <p className={styles.copy}>
              Since graduating from DigitalCrafts in March 2020, I&rsquo;ve
              spent five years building sites and applications, first for small
              businesses getting online for the first time and since for
              logistics, insurance, and agency teams. The through-line is the
              same either way: understand the business first, then build only
              what serves it.
            </p>
          </section>

          <section className={styles.block}>
            <h2 className={styles.subheading}>Experience</h2>
            <Timeline />
          </section>

          <section className={styles.block}>
            <h2 className={styles.subheading}>Stack</h2>
            <TechStack />
          </section>

          <section className={styles.block}>
            <h2 className={styles.subheading}>What clients say</h2>
            <Testimonials />
          </section>
        </div>
      </div>
    </main>
  );
}
