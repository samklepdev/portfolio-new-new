"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import TagService from "@/services/TagService";
import type { TagInput, TagListRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DeleteButton from "../DeleteButton";
import DataTable, { type Column } from "../DataTable";
import listStyles from "../list.module.css";
import styles from "./tags.module.css";

const KIND_OPTIONS = ["tech", "topic"];
const emptyTag = (): TagInput => ({ name: "", kind: "tech", iconUrl: null });
const clean = (t: TagInput): TagInput => ({
  name: t.name.trim(),
  kind: t.kind,
  iconUrl: t.iconUrl && t.iconUrl.trim() !== "" ? t.iconUrl.trim() : null,
});

function usageLabel(row: TagListRowDTO): string {
  const parts: string[] = [];
  if (row.projectCount > 0) parts.push(`${row.projectCount} project${row.projectCount === 1 ? "" : "s"}`);
  if (row.postCount > 0) parts.push(`${row.postCount} post${row.postCount === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "—";
}

export default function TagsListPage() {
  const service = useMemo(() => new TagService(), []);
  const [rows, setRows] = useState<TagListRowDTO[] | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TagInput>(emptyTag());
  const [newTag, setNewTag] = useState<TagInput>(emptyTag());

  const load = useCallback(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load tags"));
  }, [service]);

  useEffect(() => load(), [load]);

  async function create() {
    if (newTag.name.trim() === "") return;
    try {
      await service.save(clean(newTag));
      toast.success("Tag created");
      setNewTag(emptyTag());
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Create failed");
    }
  }

  function startEdit(row: TagListRowDTO) {
    setEditingId(row.id);
    setDraft({ name: row.name, kind: row.kind, iconUrl: row.iconUrl });
  }

  async function saveEdit(id: number) {
    if (draft.name.trim() === "") {
      toast.error("Tag name is required");
      return;
    }
    try {
      await service.edit(String(id), clean(draft));
      toast.success("Tag saved");
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  async function remove(row: TagListRowDTO) {
    try {
      await service.delete(String(row.id));
      toast.success(`Deleted “${row.name}”`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  const confirmLabel = (row: TagListRowDTO) =>
    row.projectCount + row.postCount > 0 ? `Unlinks from ${usageLabel(row)} — confirm?` : "Confirm?";

  const columns: Column<TagListRowDTO>[] = [
    {
      key: "name",
      header: "Name",
      sort: (row) => row.name,
      cell: (row) =>
        editingId === row.id ? (
          <input
            className={styles.cellInput}
            aria-label={`Edit name ${row.name}`}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        ) : (
          row.name
        ),
    },
    {
      key: "kind",
      header: "Kind",
      sort: (row) => row.kind,
      cell: (row) =>
        editingId === row.id ? (
          <select
            className={styles.cellInput}
            aria-label={`Edit kind ${row.name}`}
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        ) : (
          row.kind
        ),
    },
    {
      key: "usedBy",
      header: "Used by",
      sort: (row) => row.projectCount + row.postCount,
      cell: (row) => usageLabel(row),
    },
    {
      key: "icon",
      header: "Icon",
      cell: (row) =>
        editingId === row.id ? (
          <input
            className={styles.cellInput}
            aria-label={`Edit icon ${row.name}`}
            value={draft.iconUrl ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, iconUrl: e.target.value }))}
          />
        ) : (
          row.iconUrl ?? "—"
        ),
    },
    {
      key: "actions",
      header: "",
      cellClassName: listStyles.rowActions,
      cell: (row) =>
        editingId === row.id ? (
          <>
            <button type="button" className={styles.add} onClick={() => saveEdit(row.id)}>Save</button>
            <button type="button" className={styles.cancel} onClick={() => setEditingId(null)}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className={styles.edit} aria-label={`Edit ${row.name}`} onClick={() => startEdit(row)}>
              Edit
            </button>
            <DeleteButton onConfirm={() => remove(row)} confirmLabel={confirmLabel(row)} />
          </>
        ),
    },
  ];

  return (
    <div>
      <div className={listStyles.header}>
        <h1 className={listStyles.heading}>Tags</h1>
      </div>

      <div className={styles.newRow}>
        <input aria-label="New tag name" placeholder="New tag name" value={newTag.name}
          onChange={(e) => setNewTag((t) => ({ ...t, name: e.target.value }))} />
        <select aria-label="New tag kind" value={newTag.kind}
          onChange={(e) => setNewTag((t) => ({ ...t, kind: e.target.value }))}>
          {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input aria-label="New tag icon URL" placeholder="Icon URL (optional)" value={newTag.iconUrl ?? ""}
          onChange={(e) => setNewTag((t) => ({ ...t, iconUrl: e.target.value }))} />
        <button type="button" className={styles.add} onClick={create}>Add tag</button>
      </div>

      {rows === null ? (
        <p className={listStyles.muted}>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(row) => row.id}
          search={(row) => `${row.name} ${row.kind}`}
          searchPlaceholder="Search tags…"
          emptyLabel="No tags yet."
        />
      )}
    </div>
  );
}
