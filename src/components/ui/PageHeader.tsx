import Link from "next/link";
import type { ReactNode } from "react";
import { ContourField } from "@/components/ui/ContourField";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  title: string;
  backLinkText: string;
  backLinkHref?: string;
  subtitle?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({
  title,
  backLinkText,
  backLinkHref = "/",
  subtitle,
  children,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.backdrop} aria-hidden="true">
        <ContourField />
        <div className={styles.glow}>
          <div className={styles.glowShape} />
        </div>
      </div>

      <div className={styles.content}>
        <Link href={backLinkHref} className={styles.back}>
          <span aria-hidden="true">←</span> {backLinkText}
        </Link>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}
