import { ContactForm } from "./ContactForm";
import styles from "./ContactSection.module.css";

/**
 * Not a testimonial. There are none in the repo and the old site had none, and
 * writing one would be fabricated social proof — the same rule this project
 * already applies to metrics. This is content that is true today, and it does
 * the same job: it lowers the cost of sending the first message.
 */
const STEPS = [
  "Every message is read personally. No inbox filter, no assistant.",
  "You'll hear back within two business days.",
  "Rough scope and budget help, but aren't required to start talking.",
];

const EMAIL = "hello@samklep.dev";

export function ContactSection() {
  // Rendered on the server so the "submitted impossibly fast" check still works
  // with JavaScript disabled. The page is prerendered and revalidated, so this
  // timestamp can be stale — which only ever makes the elapsed time longer and
  // can never produce a false "too fast".
  const renderedAt = Date.now();

  return (
    <section
      className={styles.section}
      id="contact"
      aria-labelledby="contact-heading"
    >
      <div className={styles.inner}>
        <div className={styles.formColumn}>
          <h2 id="contact-heading" className={styles.heading}>
            Get in touch
          </h2>
          <p className={styles.intro}>
            Have a project in mind, or just want to talk shop? Tell me a little
            about it and I&rsquo;ll come back to you.
          </p>

          <ContactForm renderedAt={renderedAt} />
        </div>

        <aside className={styles.panel}>
          {/* Green is reserved for status indicators — this is one. */}
          <p className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            Available for work
          </p>

          <h3 className={styles.panelHeading}>What happens next</h3>

          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className={styles.stepText}>{step}</p>
              </li>
            ))}
          </ol>

          <p className={styles.fallback}>
            Prefer email?{" "}
            <a className={styles.fallbackLink} href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          </p>
        </aside>
      </div>
    </section>
  );
}
