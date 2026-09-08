import Image from "next/image";
import Link from "next/link";
import styles from "./AboutSection.module.css";

/**
 * The old homepage's pitch, addressed to a business owner — not the biography
 * that lives on /about. The logo band above already argues credibility without
 * prose; this argues capability.
 */
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
    // The old site promised dynamic metadata would *guarantee* top Google
    // results. Nobody can promise a ranking, and an unverifiable claim costs
    // more credibility than it buys — the same reason the logo band states no
    // count. This says what actually gets delivered instead.
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
        {/* Decorative: the copy beside it carries all the meaning, so an alt
            text here would only add noise to a screen reader. */}
        <figure className={styles.figure}>
          <Image
            className={styles.image}
            src="/images/laptop.jpg"
            alt=""
            fill
            // Without this the srcset is built from the intrinsic 4921px width
            // and ships an order of magnitude more pixels than it renders.
            sizes="(min-width: 1024px) 45vw, 100vw"
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
