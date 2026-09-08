import Image from "next/image";
import Link from "next/link";
import styles from "./AboutSection.module.css";

const CAPABILITIES = [
  {
    title: "Modern",
    body: "Responsive layouts that look right on every device, fast loads, and modern tooling with analytics wired in from the start.",
  },
  {
    title: "Full-stack",
    body: "From simple brochure sites to heavy, data-driven applications — secure, and built for the situation at hand.",
  },
  {
    title: "SEO optimized",
    body: "Dynamic metadata and clean markup, so the people already searching for your business are the ones who find it.",
  },
];

export function AboutSection() {
  return (
    <section
      className={styles.section}
      id="about"
      aria-labelledby="about-heading"
    >
      <div className={styles.inner}>
        <figure className={styles.figure}>
          <Image
            className={styles.image}
            src="/images/laptop.jpg"
            alt=""
            fill
            sizes="(min-width: 1024px) 56vw, 100vw"
          />
        </figure>

        <div className={styles.content}>
          <h2 id="about-heading" className={styles.heading}>
            What I do
          </h2>

          <p className={styles.intro}>
            Knowing what it takes to get your business online is half the
            battle. From responsive layout to SEO optimization, social media to
            Google Analytics &mdash; I&rsquo;ve got you covered.
          </p>

          <ol className={styles.list}>
            {CAPABILITIES.map((item, index) => (
              <li key={item.title} className={styles.item}>
                <span className={styles.number} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  <p className={styles.itemText}>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link href="/about" className={styles.link}>
            More about me <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
