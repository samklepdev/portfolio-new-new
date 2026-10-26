"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import PostService from "@/services/PostService";
import type { PostRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DeleteButton from "../DeleteButton";
import DataTable, { type Column } from "../DataTable";
import styles from "../list.module.css";

export default function PostsListPage() {
  const service = useMemo(() => new PostService(), []);
  const [rows, setRows] = useState<PostRowDTO[] | null>(null);

  const load = useCallback(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load posts"));
  }, [service]);

  useEffect(() => load(), [load]);

  const remove = useCallback(
    async (id: number, title: string) => {
      try {
        await service.delete(String(id));
        toast.success(`Deleted “${title}”`);
        load();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Delete failed");
      }
    },
    [service, load],
  );

  const columns = useMemo<Column<PostRowDTO>[]>(
    () => [
      {
        key: "title",
        header: "Title",
        sort: (p) => p.title,
        cell: (p) => (
          <>
            {p.title}
            <span className={styles.slug}>/{p.slug}</span>
          </>
        ),
      },
      {
        key: "status",
        header: "Status",
        sort: (p) => p.status,
        cell: (p) => (
          <span className={`${styles.status} ${p.status === "published" ? styles.statusPublished : ""}`}>
            {p.status}
          </span>
        ),
      },
      {
        key: "featured",
        header: "Featured",
        sort: (p) => (p.featured ? 1 : 0),
        cell: (p) => (p.featured ? "★" : ""),
      },
      {
        key: "publishedAt",
        header: "Published",
        sort: (p) => p.publishedAt,
        cell: (p) => p.publishedAt ?? "—",
      },
      {
        key: "actions",
        header: "",
        cellClassName: styles.rowActions,
        cell: (p) => (
          <>
            <Link className={styles.editLink} href={`/admin/posts/${p.id}/edit`} aria-label={`Edit ${p.title}`}>
              Edit
            </Link>
            <DeleteButton onConfirm={() => remove(p.id, p.title)} />
          </>
        ),
      },
    ],
    [remove],
  );

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>Posts</h1>
        <Link className={styles.newLink} href="/admin/posts/new">New post</Link>
      </div>
      {rows === null ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(p) => p.id}
          search={(p) => `${p.title} ${p.slug} ${p.status}`}
          searchPlaceholder="Search posts…"
          emptyLabel="No posts yet."
        />
      )}
    </div>
  );
}
