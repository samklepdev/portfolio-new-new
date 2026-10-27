"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ThemeService from "@/services/ThemeService";
import type { ThemeInput } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import ThemeForm from "../../ThemeForm";
import styles from "../../editor.module.css";

export default function NewThemePage() {
  const service = useMemo(() => new ThemeService(), []);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(input: ThemeInput) {
    setSubmitting(true);
    try {
      await service.save(input);
      toast.success("Theme created");
      router.push("/admin/themes");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Create failed");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className={styles.heading}>New theme</h1>
      <ThemeForm submitLabel="Create theme" onSubmit={onSubmit} submitting={submitting} />
    </div>
  );
}
