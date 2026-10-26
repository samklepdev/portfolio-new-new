"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ProjectService from "@/services/ProjectService";
import type { ProjectInput } from "@/services/types";
import ProjectForm, { emptyProjectInput } from "../../ProjectForm";
import styles from "../../editor.module.css";

export default function NewProjectPage() {
  const service = useMemo(() => new ProjectService(), []);
  const router = useRouter();

  async function onSubmit(input: ProjectInput) {
    await service.save(input);
    toast.success(`Created “${input.title}”`);
    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <div>
      <h1 className={styles.heading}>New project</h1>
      <ProjectForm initial={emptyProjectInput()} submitLabel="Create" onSubmit={onSubmit} />
    </div>
  );
}
