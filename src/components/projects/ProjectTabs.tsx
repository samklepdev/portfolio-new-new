"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import styles from "./ProjectTabs.module.css";

export type ProjectTab = {
  id: string;
  label: string;
  image: { src: string; alt: string } | null;
  content: ReactNode;
};

/**
 * The tech/design panels from the old site. Content is server-rendered and
 * passed in as children, so the only thing shipped to the client is the tab
 * switching itself.
 */
export function ProjectTabs({ tabs }: { tabs: ProjectTab[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 0) return null;

  // A single panel needs no tablist — rendering one tab to click is noise.
  if (tabs.length === 1) {
    return <TabPanel tab={tabs[0]} className={styles.solo} />;
  }

  // Arrow keys move between tabs, per the ARIA tabs pattern. Without this the
  // tablist is reachable but not navigable by keyboard.
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const last = tabs.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (event.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className={styles.wrapper}>
      <div role="tablist" aria-label="Project details" className={styles.tablist}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-controls={`${baseId}-panel-${tab.id}`}
            aria-selected={index === active}
            // Only the active tab is in the tab order; arrow keys move within.
            tabIndex={index === active ? 0 : -1}
            className={`${styles.tab} ${index === active ? styles.tabActive : ""}`}
            onClick={() => setActive(index)}
            onKeyDown={onKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== active}
          tabIndex={0}
        >
          {/* Every panel stays mounted so the server-rendered content is in the
              DOM for crawlers, rather than appearing only after a click. */}
          <TabPanel tab={tab} />
        </div>
      ))}
    </div>
  );
}

function TabPanel({ tab, className }: { tab: ProjectTab; className?: string }) {
  return (
    <div className={`${styles.panel} ${className ?? ""}`}>
      <div className={styles.prose}>{tab.content}</div>
      {tab.image && (
        // Screenshots are arbitrary sizes declared in content frontmatter;
        // next/image wants known dimensions or a configured loader, which is
        // roadmap polish work rather than something to guess at here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tab.image.src}
          alt={tab.image.alt}
          className={styles.image}
          loading="lazy"
        />
      )}
    </div>
  );
}
