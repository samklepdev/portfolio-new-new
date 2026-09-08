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

  // Only the home page has the pinned hero to scroll past; everywhere else the
  // bar is there from first paint. Deriving this from the route rather than
  // from "has a hero mounted yet" keeps the first render correct on the server
  // too, so inner pages never flash a nav in.
  const gatedByHero = pathname === "/";
  const visible = !gatedByHero || heroDismissed;

  // Navigating with the menu open would otherwise leave it open on the next
  // page. Also close it if the bar retreats behind the hero.
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

  // "/" only matches itself; every other link owns its subtree, so a project
  // detail page still marks Projects as current.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`${styles.bar} ${visible ? styles.visible : ""}`}
      // Keeps the hidden bar out of the tab order — it is only moved offscreen,
      // not unmounted, so it would otherwise still be focusable over the hero.
      inert={!visible}
    >
      <nav className={styles.nav} aria-label="Main">
        <Link href="/" className={styles.logo} aria-label="Sam Klepper — home">
          {/* The "-dark" file is the light-artwork variant, i.e. the one meant
              to sit on a dark background. unoptimized because the optimizer
              refuses SVG without dangerouslyAllowSVG — and there is nothing in
              a vector for it to optimize. */}
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
