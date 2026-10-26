"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import styles from "./IndustryFilter.module.css";

export type IndustryOption = { name: string; slug: string };

type IndustryFilterProps = {
  industries: IndustryOption[];
  /** Slug of the active industry, or undefined when showing all. */
  activeSlug?: string;
};

export function IndustryFilter({ industries, activeSlug }: IndustryFilterProps) {
  const router = useRouter();
  const selectId = useId();

  if (industries.length === 0) return null;

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const slug = event.target.value;
    router.push(slug ? `/projects?industry=${slug}` : "/projects");
  }

  return (
    <div className={styles.filter}>
      <label htmlFor={selectId} className={styles.label}>
        Industry
      </label>
      <div className={styles.selectWrap}>
        <select
          id={selectId}
          className={styles.select}
          value={activeSlug ?? ""}
          onChange={onChange}
        >
          <option value="">All industries</option>
          {industries.map((industry) => (
            <option key={industry.slug} value={industry.slug}>
              {industry.name}
            </option>
          ))}
        </select>
        <svg
          className={styles.caret}
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
