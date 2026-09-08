import type { CSSProperties } from "react";
import styles from "./RingField.module.css";

const RING_COUNT = 26;

export function RingField() {
  return (
    <div className={styles.field} aria-hidden="true">
      <svg className={styles.rings} viewBox="0 0 500 500" fill="none">
        {Array.from({ length: RING_COUNT }, (_, index) => (
          <circle
            key={index}
            className={styles.ring}
            cx="250"
            cy="250"
            r={index * 14 + 4}
            style={{ "--i": index } as CSSProperties}
          />
        ))}
      </svg>
      <span className={styles.core} />
    </div>
  );
}
