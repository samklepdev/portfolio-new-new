import styles from "./WireframeField.module.css";

const ROWS = ["62%", "88%", "44%"];

/**
 * Two mini page mocks side by side — a hairline wireframe resolving into a
 * rendered one. Illustrates the "first wireframe to launch" claim on the
 * Design & build card without showing any real client's interface.
 */
export function WireframeField() {
  return (
    <div className={styles.field} aria-hidden="true">
      <div className={`${styles.page} ${styles.draft}`}>
        <span className={styles.hero} />
        {ROWS.map((width) => (
          <span key={width} className={styles.row} style={{ width }} />
        ))}
      </div>

      <span className={styles.arrow} />

      <div className={`${styles.page} ${styles.built}`}>
        <span className={styles.hero} />
        {ROWS.map((width) => (
          <span key={width} className={styles.row} style={{ width }} />
        ))}
      </div>
    </div>
  );
}
