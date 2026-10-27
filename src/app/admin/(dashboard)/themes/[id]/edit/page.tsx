"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ThemeService from "@/services/ThemeService";
import type { ThemeInput, ThemeRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import ThemeForm from "../../../ThemeForm";
import styles from "../../../editor.module.css";

export default function EditThemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = useMemo(() => new ThemeService(), []);
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeRowDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    service
      .get(id)
      .then(setTheme)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load theme"));
  }, [service, id]);

  async function onSubmit(input: ThemeInput) {
    setSubmitting(true);
    try {
      await service.edit(id, input);
      toast.success("Theme saved");
      router.push("/admin/themes");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
      setSubmitting(false);
    }
  }

  if (!theme) return <p className={styles.heading}>Loading…</p>;

  return (
    <div>
      <h1 className={styles.heading}>Edit theme</h1>
      <ThemeForm initial={theme} submitLabel="Save" onSubmit={onSubmit} submitting={submitting} />
    </div>
  );
}
