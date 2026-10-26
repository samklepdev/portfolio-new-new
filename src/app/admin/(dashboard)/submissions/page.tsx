"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import SubmissionService from "@/services/SubmissionService";
import type { SubmissionRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
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

  return (
    <div>
      <div className={listStyles.header}>
        <h1 className={listStyles.heading}>Submissions</h1>
      </div>
      {rows === null ? (
        <p className={listStyles.muted}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className={listStyles.muted}>No submissions yet.</p>
      ) : (
        <table className={listStyles.table}>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Received</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const status = deliveryStatus(s);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{dateFmt.format(new Date(s.createdAt))}</td>
                  <td><span className={`${styles.badge} ${styles[status]}`}>{status}</span></td>
                  <td className={listStyles.rowActions}>
                    <Link className={listStyles.editLink} href={`/admin/submissions/${s.id}`}
                      aria-label={`View ${s.name}`}>View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
