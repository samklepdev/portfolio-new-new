"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import ThemeService from "@/services/ThemeService";
import type { ThemeRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DeleteButton from "../DeleteButton";
import DataTable, { type Column } from "../DataTable";
import listStyles from "../list.module.css";
import styles from "./themes.module.css";

const SWATCH_KEYS = ["background", "turquoise", "pink", "purple", "green"] as const;

export default function ThemesListPage() {
  const service = useMemo(() => new ThemeService(), []);
  const [rows, setRows] = useState<ThemeRowDTO[] | null>(null);

  const load = useCallback(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load themes"));
  }, [service]);

  useEffect(() => load(), [load]);

  const activate = useCallback(
    async (id: number, name: string) => {
      try {
        await service.activate(String(id));
        toast.success(`Activated "${name}"`);
        load();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Activate failed");
      }
    },
    [service, load],
  );

  const remove = useCallback(
    async (id: number, name: string) => {
      try {
        await service.delete(String(id));
        toast.success(`Deleted "${name}"`);
        load();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Delete failed");
      }
    },
    [service, load],
  );

  const useDefault = useCallback(async () => {
    try {
      await service.useDefault();
      toast.success("Reverted to the default theme");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to revert");
    }
  }, [service, load]);

  const columns = useMemo<Column<ThemeRowDTO>[]>(
    () => [
      { key: "name", header: "Name", sort: (t) => t.name, cell: (t) => t.name },
      {
        key: "swatches",
        header: "Palette",
        cell: (t) => (
          <span className={styles.swatches}>
            {SWATCH_KEYS.map((k) => (
              <span key={k} className={styles.swatch} style={{ background: t[k] }} title={t[k]} />
            ))}
          </span>
        ),
      },
      {
        key: "heroPreset",
        header: "Animation",
        sort: (t) => t.heroPreset ?? "orbit",
        cell: (t) => t.heroPreset ?? "orbit",
      },
      {
        key: "active",
        header: "Status",
        sort: (t) => (t.isActive ? 1 : 0),
        cell: (t) =>
          t.isActive ? <span className={styles.activePill}>Active</span> : "",
      },
      {
        key: "actions",
        header: "",
        cellClassName: listStyles.rowActions,
        cell: (t) => (
          <>
            <Link className={listStyles.editLink} href={`/admin/themes/${t.id}/edit`} aria-label={`Edit ${t.name}`}>
              Edit
            </Link>
            {!t.isActive && (
              <button
                type="button"
                className={styles.activateBtn}
                aria-label={`Activate ${t.name}`}
                onClick={() => activate(t.id, t.name)}
              >
                Activate
              </button>
            )}
            <DeleteButton onConfirm={() => remove(t.id, t.name)} />
          </>
        ),
      },
    ],
    [activate, remove],
  );

  const hasActive = rows?.some((t) => t.isActive) ?? false;

  return (
    <div>
      <div className={listStyles.header}>
        <h1 className={listStyles.heading}>Themes</h1>
        <Link className={listStyles.newLink} href="/admin/themes/new">New theme</Link>
      </div>

      <button
        type="button"
        className={styles.useDefaultBtn}
        onClick={useDefault}
        disabled={!hasActive}
      >
        Use default theme
      </button>

      {rows === null ? (
        <p className={listStyles.muted}>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(t) => t.id}
          search={(t) => t.name}
          searchPlaceholder="Search themes…"
          emptyLabel="No themes yet."
        />
      )}
    </div>
  );
}
