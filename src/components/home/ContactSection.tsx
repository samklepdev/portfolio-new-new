import { ContactForm } from "./ContactForm";
import styles from "./ContactSection.module.css";

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
      <div className={styles.header}>
        <h2 id="contact-heading" className={styles.heading}>
          Let&rsquo;s talk about your project
        </h2>
        <p className={styles.intro}>
          Websites and applications for businesses that need to be found and
          taken seriously online.
        </p>
      </div>

      <div className={styles.inner}>
        <div className={styles.formColumn}>
          <ContactForm renderedAt={renderedAt} />
        </div>

        {/* Not a testimonial. There are none in the repo and the old site had
            none; writing one would be fabricated social proof. This says what
            is true instead, which does the same job — it lowers the cost of
            sending the first message. */}
        <aside className={styles.aside}>
          <p className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            Available for work
          </p>

          <h3 className={styles.asideHeading}>What to expect</h3>

          <p className={styles.asideText}>
            Every message reaches me directly &mdash; no inbox filter, no
            assistant. You&rsquo;ll hear back within two business days, usually
            sooner. A rough budget and timeline help, but nothing is required to
            start a conversation.
          </p>

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
