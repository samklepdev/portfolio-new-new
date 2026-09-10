import Image from "next/image";
import { TESTIMONIALS } from "@/lib/testimonials";
import styles from "./Testimonials.module.css";

export function Testimonials() {
  return (
    <div className={styles.list}>
      {TESTIMONIALS.map((testimonial) => (
        <figure key={testimonial.id} className={styles.card}>
          <p
            className={styles.rating}
            role="img"
            aria-label={`${testimonial.rating} out of 5 stars`}
          >
            <span aria-hidden="true">{"★".repeat(testimonial.rating)}</span>
          </p>

          <blockquote className={styles.quote}>
            {testimonial.quote}
          </blockquote>
          <figcaption className={styles.attribution}>
            <Image
              className={styles.logo}
              src={testimonial.logo.src}
              alt=""
              width={testimonial.logo.width}
              height={testimonial.logo.height}
            />
            <span>
              <span className={styles.name}>{testimonial.name}</span>
              <span className={styles.role}>{testimonial.title}</span>
              <span className={styles.company}>{testimonial.company}</span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
