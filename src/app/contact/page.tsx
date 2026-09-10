import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactMethods } from "@/components/contact/ContactMethods";
import { ContactForm } from "@/components/home/ContactForm";
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
import { RESUME_URL, SOCIAL_LINKS } from "@/lib/siteLinks";
import { getTestimonial } from "@/lib/testimonials";
import styles from "./page.module.css";

const TESTIMONIAL = getTestimonial("ultra");

export const metadata: Metadata = {
  title: "Contact — Sam Klepper",
  description:
    "Start a project with Sam Klepper — full-stack developer in Houston, TX. Tell me what you're building and I'll reply within two business days.",
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <div className={styles.grid}>
        <div className={styles.introColumn}>
          <div className={styles.panel} aria-hidden="true" />

          <div className={styles.introInner}>
            <Link href="/" className={styles.back}>
              <span aria-hidden="true">←</span> Home
            </Link>

            <h1 className={styles.heading}>Get in touch</h1>

            <p className={styles.intro}>
              Tell me what you&rsquo;re building, roughly what you&rsquo;re
              working with, and when you need it. I read every message and
              reply within two business days.
            </p>

            <AvailabilityStatus className={styles.status} />

            <ContactMethods />

            <ul className={styles.links} role="list">
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
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resume
                </a>
              </li>
            </ul>

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
                <span aria-hidden="true">{"★".repeat(TESTIMONIAL.rating)}</span>
              </p>

              <blockquote className={styles.quote}>
                <p>&ldquo;{TESTIMONIAL.quote}&rdquo;</p>
              </blockquote>

              <figcaption className={styles.attribution}>
                <span className={styles.attributionName}>
                  {TESTIMONIAL.name}
                </span>
                <span className={styles.attributionRole}>
                  {TESTIMONIAL.title}, {TESTIMONIAL.company}
                </span>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className={styles.formColumn}>
          <div className={styles.formInner}>
            <ContactForm />
          </div>
        </div>
      </div>
    </main>
  );
}
