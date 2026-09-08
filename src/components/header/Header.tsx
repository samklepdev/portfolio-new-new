"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScrollStore } from "@/lib/scrollStore";
import { NAV_LINKS, RESUME_URL } from "@/lib/siteLinks";
import styles from "./Header.module.css";

export function Header() {
  const pathname = usePathname();
  const heroDismissed = useScrollStore((state) => state.heroDismissed);
  const [menuOpen, setMenuOpen] = useState(false);

  const gatedByHero = pathname === "/";
  const visible = !gatedByHero || heroDismissed;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, visible]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`${styles.bar} ${visible ? styles.visible : ""}`}
      inert={!visible}
    >
      <nav className={styles.nav} aria-label="Main">
        <Link href="/" className={styles.logo} aria-label="Sam Klepper — home">
          <Image
            src="/images/sbk-logo-dark.svg"
            alt=""
            width={44}
            height={32}
            unoptimized
          />
        </Link>

        <ul id="header-nav-links" className={styles.links} data-open={menuOpen}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`${styles.link} ${
                  isActive(link.href) ? styles.active : ""
                }`}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <a className={styles.resume} href={RESUME_URL} download>
            Resume
            <svg
              className={styles.resumeIcon}
              viewBox="0 0 16 16"
              width="14"
              height="14"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M8 1v9m0 0 3.5-3.5M8 10 4.5 6.5M2 12.5V14h12v-1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <Image
            className={styles.avatar}
            src="/images/samK-head.jpeg"
            alt=""
            width={32}
            height={32}
          />

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="header-nav-links"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.srOnly}>
              {menuOpen ? "Close menu" : "Open menu"}
            </span>
            <span className={styles.menuIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
}
