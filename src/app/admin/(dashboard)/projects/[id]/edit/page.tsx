"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ProjectService from "@/services/ProjectService";
import type { ProjectInput, ProjectRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import ProjectForm from "../../../ProjectForm";
import styles from "../../../editor.module.css";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = useMemo(() => new ProjectService(), []);
  const router = useRouter();
  const [initial, setInitial] = useState<ProjectRowDTO | null>(null);

  useEffect(() => {
    service
      .get(id)
      .then(setInitial)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load project"));
  }, [service, id]);

  async function onSubmit(input: ProjectInput) {
    await service.edit(id, input);
    toast.success(`Saved “${input.title}”`);
    router.push("/admin/projects");
    router.refresh();
  }

  if (!initial) return <p className={styles.heading}>Loading…</p>;

  return (
    <div>
      <h1 className={styles.heading}>Edit project</h1>
      <ProjectForm initial={initial} submitLabel="Save changes" onSubmit={onSubmit} />
    </div>
  );
}
