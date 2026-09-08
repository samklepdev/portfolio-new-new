import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const FOCUS = [
  "Full-stack software development",
  "SEO-optimized sites and applications",
  "Data-driven infrastructure and analytics",
  "Serverless architecture",
];

export const metadata: Metadata = {
  title: "About — Sam Klepper",
  description:
    "Full-stack developer in Houston, TX — TypeScript, React, and C#.",
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Home
      </Link>
      <h1 className={styles.heading}>About</h1>
      <p className={styles.intro}>
        Hello. I&rsquo;m Sam &mdash; a developer from Houston, TX with a passion
        for all things tech who enjoys making applications.
      </p>

      <div className={styles.inner}>
        <div className={styles.portrait}>
          <Image
            src="/images/sam3-cr.jpg"
            alt="Sam Klepper"
            fill
            className={styles.portraitImage}
            sizes="(min-width: 900px) 20rem, 70vw"
          />
        </div>

        <div className={styles.body}>
          <p className={styles.copy}>
            After initially pursuing a degree in graphic design, I found my
            passion for software development. Since graduating from the
            DigitalCrafts coding bootcamp in March 2020, I&rsquo;ve helped
            numerous small businesses get their companies online, and consider
            it a passion of mine.
          </p>

          <h2 className={styles.subheading}>What I do</h2>
          <ul className={styles.focus}>
            {FOCUS.map((item) => (
              <li key={item} className={styles.focusItem}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
