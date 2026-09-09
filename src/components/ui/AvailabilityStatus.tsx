import styles from "./AvailabilityStatus.module.css";

type AvailabilityStatusProps = {
  className?: string;
};

export function AvailabilityStatus({ className }: AvailabilityStatusProps) {
  return (
    <p className={[styles.status, className].filter(Boolean).join(" ")}>
      <span className={styles.dot} aria-hidden="true" />
      Available for work
    </p>
  );
}
