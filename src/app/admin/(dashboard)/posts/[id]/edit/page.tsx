"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import PostService from "@/services/PostService";
import type { PostInput, PostRowDTO } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import PostForm from "../../../PostForm";
import styles from "../../../editor.module.css";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const service = useMemo(() => new PostService(), []);
  const router = useRouter();
  const [initial, setInitial] = useState<PostRowDTO | null>(null);

  useEffect(() => {
    service
      .get(id)
      .then(setInitial)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load post"));
  }, [service, id]);

  async function onSubmit(input: PostInput) {
    await service.edit(id, input);
    toast.success(`Saved “${input.title}”`);
    router.push("/admin/posts");
    router.refresh();
  }

  if (!initial) return <p className={styles.heading}>Loading…</p>;

  return (
    <div>
      <h1 className={styles.heading}>Edit post</h1>
      <PostForm initial={initial} submitLabel="Save changes" onSubmit={onSubmit} />
    </div>
  );
}
