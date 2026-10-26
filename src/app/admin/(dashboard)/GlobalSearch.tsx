"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ProjectService from "@/services/ProjectService";
import PostService from "@/services/PostService";
import TagService from "@/services/TagService";
import SubmissionService from "@/services/SubmissionService";
import { ApiError } from "@/services/ApiError";
import { buildResultItems, filterResults, type SearchData } from "./search";
import styles from "./GlobalSearch.module.css";

const EMPTY: SearchData = { projects: [], posts: [], tags: [], submissions: [] };

function loadError(reason: unknown, label: string): string {
  return reason instanceof ApiError ? reason.message : `Could not load ${label}`;
}

export default function GlobalSearch() {
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<SearchData>(EMPTY);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Fetch the four lists once; one failing endpoint must not blank the others.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      new ProjectService().list(),
      new PostService().list(),
      new TagService().list(),
      new SubmissionService().list(),
    ]).then(([p, o, t, s]) => {
      if (cancelled) return;
      if (p.status === "rejected") toast.error(loadError(p.reason, "projects"));
      if (o.status === "rejected") toast.error(loadError(o.reason, "posts"));
      if (t.status === "rejected") toast.error(loadError(t.reason, "tags"));
      if (s.status === "rejected") toast.error(loadError(s.reason, "submissions"));
      setData({
        projects: p.status === "fulfilled" ? p.value : [],
        posts: o.status === "fulfilled" ? o.value : [],
        tags: t.status === "fulfilled" ? t.value : [],
        submissions: s.status === "fulfilled" ? s.value : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce the query so keystroke→filter stays off the critical path.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const items = useMemo(() => buildResultItems(data), [data]);
  const groups = useMemo(() => filterResults(items, debounced), [items, debounced]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  // Reset the keyboard highlight whenever the result set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced]);

  // Dismiss on outside pointer-down while open.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const showDropdown = open && query.trim() !== "";
  const activeKey = activeIndex >= 0 ? flat[activeIndex]?.key : undefined;

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      const item = activeIndex >= 0 ? flat[activeIndex] : undefined;
      if (item) {
        event.preventDefault();
        setOpen(false);
        // Clear the query on selection: the user is navigating away, and a
        // stale query left in the box would otherwise suppress the next
        // onChange if they immediately re-type the same text (React's
        // controlled-input value tracker only fires onChange on an actual
        // value change).
        setQuery("");
        router.push(item.href);
      }
    }
  }

  return (
    <div className={styles.search} ref={containerRef}>
      <svg
        className={styles.icon}
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        className={styles.input}
        type="search"
        role="combobox"
        aria-label="Search admin content"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeKey ? `${listboxId}-${activeKey}` : undefined}
        autoComplete="off"
        placeholder="Search projects, posts, tags, submissions…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim() !== "") setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {showDropdown && (
        <div className={styles.dropdown}>
          <ul className={styles.listbox} role="listbox" id={listboxId}>
            {flat.length === 0 ? (
              <li className={styles.empty}>No matches for “{query.trim()}”.</li>
            ) : (
              groups.map((group) => (
                <li key={group.type} className={styles.group} role="group" aria-label={group.heading}>
                  <p className={styles.groupHeading} aria-hidden="true">
                    {group.heading}
                  </p>
                  <ul className={styles.groupItems} role="presentation">
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <Link
                          id={`${listboxId}-${item.key}`}
                          role="option"
                          aria-selected={item.key === activeKey}
                          className={`${styles.option} ${item.key === activeKey ? styles.active : ""}`}
                          href={item.href}
                          onMouseEnter={() => setActiveIndex(flat.findIndex((f) => f.key === item.key))}
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <span className={styles.optionLabel}>{item.label}</span>
                          {item.sublabel && (
                            <span className={styles.optionSub}>{item.sublabel}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {group.total > group.items.length && (
                    <Link
                      className={styles.more}
                      href={group.moreHref}
                      onClick={() => setOpen(false)}
                    >
                      +{group.total - group.items.length} more in {group.heading}
                    </Link>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
