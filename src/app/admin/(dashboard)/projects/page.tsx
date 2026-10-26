"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import ProjectService from "@/services/ProjectService";
import type { ProjectRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DeleteButton from "../DeleteButton";
import styles from "../list.module.css";

export default function ProjectsListPage() {
  const service = useMemo(() => new ProjectService(), []);
  const [rows, setRows] = useState<ProjectRowDTO[] | null>(null);

  const load = useCallback(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load projects"));
  }, [service]);

  useEffect(() => load(), [load]);

  async function remove(id: number, title: string) {
    try {
      await service.delete(String(id));
      toast.success(`Deleted “${title}”`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>Projects</h1>
        <Link className={styles.newLink} href="/admin/projects/new">New project</Link>
      </div>
      {rows === null ? (
        <p className={styles.muted}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className={styles.muted}>No projects yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Title</th><th>Status</th><th>Featured</th><th>Started</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.title}<span className={styles.slug}>/{p.slug}</span></td>
                <td>
                  <span className={`${styles.status} ${p.status === "published" ? styles.statusPublished : ""}`}>
                    {p.status}
                  </span>
                </td>
                <td>{p.featured ? "★" : ""}</td>
                <td>{p.startedAt ?? "—"}</td>
                <td className={styles.rowActions}>
                  <Link className={styles.editLink} href={`/admin/projects/${p.id}/edit`}
                    aria-label={`Edit ${p.title}`}>Edit</Link>
                  <DeleteButton onConfirm={() => remove(p.id, p.title)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
