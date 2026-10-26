"use client";

import { type ReactNode, useMemo, useState } from "react";
import styles from "./DataTable.module.css";

export interface Column<T> {
  /** Stable key; also identifies the column when sorting. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Return a comparable value to make the column sortable; omit for a static column. */
  sort?: (row: T) => string | number | null;
  cellClassName?: string;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
  /** Provide searchable text per row to render the search box. */
  search?: (row: T) => string;
  searchPlaceholder?: string;
  pageSizes?: number[];
  initialPageSize?: number;
  /** Shown when there are no rows at all (distinct from a search with no matches). */
  emptyLabel?: string;
}

type SortState = { key: string | null; dir: "asc" | "desc" };

const DEFAULT_PAGE_SIZES = [5, 10, 25];

// Build the page-button list with ellipses so long lists stay to one row:
// always the first and last page, plus a window around the current one.
function pageItems(total: number, current: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

function compare(a: string | number | null, b: string | number | null): number {
  // Nulls always sort last, regardless of direction.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export default function DataTable<T>({
  columns,
  rows,
  getKey,
  search,
  searchPlaceholder = "Search…",
  pageSizes = DEFAULT_PAGE_SIZES,
  initialPageSize,
  emptyLabel = "Nothing here yet.",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize ?? pageSizes[0] ?? 10);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = query.trim().toLowerCase();
    if (q === "") return rows;
    return rows.filter((row) => search(row).toLowerCase().includes(q));
  }, [rows, search, query]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sort) return filtered;
    const getSort = column.sort;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const result = compare(getSort(a), getSort(b));
      // Keep nulls last even when descending: only flip non-null comparisons.
      return getSort(a) === null || getSort(b) === null ? result : result * factor;
    });
  }, [filtered, columns, sort]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  function toggleSort(key: string) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <label className={styles.showEntries}>
          Show
          <select
            className={styles.select}
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          entries
        </label>

        {search && (
          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              width={16}
              height={16}
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
              className={styles.search}
              type="search"
              aria-label="Search table"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort.key === column.key;
                const ariaSort = !column.sort
                  ? undefined
                  : active
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                return (
                  <th
                    key={column.key}
                    aria-sort={ariaSort}
                    style={column.align === "right" ? { textAlign: "right" } : undefined}
                  >
                    {column.sort ? (
                      <button type="button" className={styles.sortButton} onClick={() => toggleSort(column.key)}>
                        {column.header}
                        <span className={styles.carets} aria-hidden="true">
                          <span className={active && sort.dir === "asc" ? styles.caretActive : undefined}>▲</span>
                          <span className={active && sort.dir === "desc" ? styles.caretActive : undefined}>▼</span>
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={columns.length}>
                  {rows.length === 0 ? emptyLabel : "No matches for your search."}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={getKey(row)}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.cellClassName}
                      style={column.align === "right" ? { textAlign: "right" } : undefined}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span className={styles.count}>
          Showing {from} to {to} of {total} {total === 1 ? "entry" : "entries"}
        </span>
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            Previous
          </button>
          {pageItems(totalPages, safePage).map((item, i) =>
            item === "…" ? (
              <span key={`gap-${i}`} className={styles.ellipsis} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`${styles.pageBtn} ${item === safePage ? styles.pageActive : ""}`}
                aria-current={item === safePage ? "page" : undefined}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
