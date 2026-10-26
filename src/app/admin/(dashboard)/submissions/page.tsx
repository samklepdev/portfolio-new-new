"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import SubmissionService from "@/services/SubmissionService";
import type { SubmissionRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import DataTable, { type Column } from "../DataTable";
import { deliveryStatus } from "./status";
import listStyles from "../list.module.css";
import styles from "./submissions.module.css";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function SubmissionsListPage() {
  const service = useMemo(() => new SubmissionService(), []);
  const [rows, setRows] = useState<SubmissionRowDTO[] | null>(null);

  useEffect(() => {
    service
      .list()
      .then(setRows)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load submissions"));
  }, [service]);

  const columns = useMemo<Column<SubmissionRowDTO>[]>(
    () => [
      { key: "name", header: "Name", sort: (s) => s.name, cell: (s) => s.name },
      { key: "email", header: "Email", sort: (s) => s.email, cell: (s) => s.email },
      {
        key: "createdAt",
        header: "Received",
        sort: (s) => s.createdAt,
        cell: (s) => dateFmt.format(new Date(s.createdAt)),
      },
      {
        key: "status",
        header: "Status",
        sort: (s) => deliveryStatus(s),
        cell: (s) => {
          const status = deliveryStatus(s);
          return <span className={`${styles.badge} ${styles[status]}`}>{status}</span>;
        },
      },
      {
        key: "actions",
        header: "",
        cellClassName: listStyles.rowActions,
        cell: (s) => (
          <Link className={listStyles.editLink} href={`/admin/submissions/${s.id}`} aria-label={`View ${s.name}`}>
            View
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <div className={listStyles.header}>
        <h1 className={listStyles.heading}>Submissions</h1>
      </div>
      {rows === null ? (
        <p className={listStyles.muted}>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(s) => s.id}
          search={(s) => `${s.name} ${s.email}`}
          searchPlaceholder="Search submissions…"
          emptyLabel="No submissions yet."
        />
      )}
    </div>
  );
}
