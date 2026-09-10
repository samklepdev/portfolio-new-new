import styles from "./ContourField.module.css";

const RINGS = 26;
const SAMPLES = 72;

/**
 * The contour system is generated, not drawn. Each ring is a closed loop whose
 * radius is perturbed by three sine harmonics, and whose centre drifts as the
 * rings grow outward — that drift is what stops this reading as concentric
 * rings (which `RingField` on the home page already owns) and makes it read as
 * terrain. Spacing widens outward via the `t ** 1.35` term, mimicking the way a
 * real topographic map spaces contours further apart on a shallower slope.
 *
 * Everything here is pure and deterministic, so this stays a server component:
 * no randomness, no client JS, no hydration mismatch.
 */
function contour(index: number): string {
  const t = index / (RINGS - 1);
  const radius = 40 + t ** 1.3 * 660;
  // The centre drifts right and well down as rings grow, so the outermost
  // contours sweep through the lower half of the panel instead of leaving it
  // bare. The largest rings overflow the viewBox and get clipped — that is
  // deliberate, and is what makes this read as a crop of a larger terrain
  // rather than a self-contained motif sitting in a box.
  const cx = 470 + t * 74;
  const cy = 88 + t * 168;

  const points: [number, number][] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const angle = (i / SAMPLES) * Math.PI * 2;
    const wobble =
      Math.sin(angle * 3 + t * 2.2) * (13 + t * 34) +
      Math.sin(angle * 5 - t * 3.1) * (7 + t * 19) +
      Math.sin(angle * 2 + 1.3) * (10 + t * 12);
    const r = radius + wobble;
    // Vertical squash — contours on a wide panel read better flattened.
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.78]);
  }

  return smoothClosedPath(points);
}

/** Catmull-Rom through every point, emitted as cubic béziers so the loop closes smoothly. */
function smoothClosedPath(points: [number, number][]): string {
  const n = points.length;
  const round = (v: number) => Math.round(v * 10) / 10;
  let d = `M${round(points[0][0])},${round(points[0][1])}`;

  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += `C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(p2[0])},${round(p2[1])}`;
  }

  return `${d}Z`;
}

const PATHS = Array.from({ length: RINGS }, (_, i) => contour(i));

// One contour is picked out in turquoise, the way a topographic map indexes
// every nth elevation line. Sparse by design — a second accent line turns the
// texture into noise and starts competing with the glow.
const ACCENT_RING = 6;

export function ContourField() {
  return (
    <div className={styles.field}>
      <svg
        className={styles.svg}
        viewBox="0 0 640 760"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        {PATHS.map((d, i) => (
          <path
            key={d}
            d={d}
            className={i === ACCENT_RING ? styles.accent : styles.line}
          />
        ))}
      </svg>
    </div>
  );
}
