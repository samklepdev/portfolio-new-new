import type { CSSProperties } from "react";
import styles from "./DashboardField.module.css";

const TILES = ["58%", "42%", "71%"];

/** Bar heights as a fraction of the chart, hand-set so the row reads as data
 *  rather than a pattern. The tallest is highlighted. */
const BARS = [34, 52, 41, 68, 46, 88, 57, 72, 44, 61, 38, 55];
const PEAK = Math.max(...BARS);

/**
 * A dashboard skeleton — stat tiles over a chart. Illustrates the
 * "dashboards, portals, and internal tools" claim on the Custom applications
 * card without showing any real client's interface.
 */
export function DashboardField() {
  return (
    <div className={styles.field} aria-hidden="true">
      <div className={styles.tiles}>
        {TILES.map((width) => (
          <div key={width} className={styles.tile}>
            <span className={styles.tileLabel} />
            <span className={styles.tileValue} style={{ width }} />
          </div>
        ))}
      </div>

      <div className={styles.chart}>
        {BARS.map((height, index) => (
          <span
            key={index}
            className={height === PEAK ? styles.barPeak : styles.bar}
            style={{ "--h": `${height}%` } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
