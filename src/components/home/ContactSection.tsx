import Image from "next/image";
import { EMAIL } from "@/lib/siteLinks";
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
import { getTestimonial } from "@/lib/testimonials";
import { ContactForm } from "./ContactForm";
import styles from "./ContactSection.module.css";

const TESTIMONIAL = getTestimonial("deleon");

export function ContactSection() {
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
          <ContactForm />
        </div>

        <aside className={styles.aside}>
          <AvailabilityStatus />

          <figure className={styles.testimonial}>
            <Image
              className={styles.testimonialLogo}
              src={TESTIMONIAL.logo.src}
              alt={TESTIMONIAL.company}
              width={TESTIMONIAL.logo.width}
              height={TESTIMONIAL.logo.height}
              sizes="140px"
            />

            <p
              className={styles.rating}
              role="img"
              aria-label={`${TESTIMONIAL.rating} out of 5 stars`}
            >
              <span aria-hidden="true">
                {"★".repeat(TESTIMONIAL.rating)}
              </span>
            </p>

            <blockquote className={styles.quote}>
              <p>&ldquo;{TESTIMONIAL.quote}&rdquo;</p>
            </blockquote>

            <figcaption className={styles.attribution}>
              <span className={styles.attributionName}>{TESTIMONIAL.name}</span>
              <span className={styles.attributionRole}>
                {TESTIMONIAL.title}, {TESTIMONIAL.company}
              </span>
            </figcaption>
          </figure>

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
