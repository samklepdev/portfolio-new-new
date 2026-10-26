"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import SubmissionService from "@/services/SubmissionService";
import type { SubmissionRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import { deliveryStatus } from "../status";
import listStyles from "../../list.module.css";
import styles from "../submissions.module.css";

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  dateStyle: "medium",
  timeStyle: "short",
});

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = useMemo(() => new SubmissionService(), []);
  const [row, setRow] = useState<SubmissionRowDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    service
      .get(id)
      .then(setRow)
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Failed to load submission";
        setError(message);
        toast.error(message);
      });
  }, [service, id]);

  if (error) {
    return (
      <div className={styles.detail}>
        <Link className={listStyles.editLink} href="/admin/submissions">← All submissions</Link>
        <p className={listStyles.muted}>{error}</p>
      </div>
    );
  }
  if (!row) return <p className={listStyles.muted}>Loading…</p>;

  const status = deliveryStatus(row);
  return (
    <div className={styles.detail}>
      <Link className={listStyles.editLink} href="/admin/submissions">← All submissions</Link>
      <h1 className={listStyles.heading}>{row.name}</h1>
      <p className={styles.email}>
        <a href={`mailto:${row.email}`}>{row.email}</a>
        <span className={`${styles.badge} ${styles[status]}`}>{status}</span>
      </p>
      <dl className={styles.meta}>
        {row.budget && (<><dt>Budget</dt><dd>{row.budget}</dd></>)}
        {row.website && (<><dt>Website</dt><dd>{row.website}</dd></>)}
        <dt>Received</dt>
        <dd>{dateTimeFmt.format(new Date(row.createdAt))}</dd>
        {row.emailedAt && (<><dt>Delivered</dt><dd>{dateTimeFmt.format(new Date(row.emailedAt))}</dd></>)}
        {row.emailError && (<><dt>Email error</dt><dd className={styles.error}>{row.emailError}</dd></>)}
      </dl>
      <div className={styles.message}>{row.message}</div>
    </div>
  );
}
