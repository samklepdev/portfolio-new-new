"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import PostService from "@/services/PostService";
import type { PostInput } from "@/services/types";
import PostForm, { emptyPostInput } from "../../PostForm";
import styles from "../../editor.module.css";

export default function NewPostPage() {
  const service = useMemo(() => new PostService(), []);
  const router = useRouter();

  async function onSubmit(input: PostInput) {
    await service.save(input);
    toast.success(`Created “${input.title}”`);
    router.push("/admin/posts");
    router.refresh();
  }

  return (
    <div>
      <h1 className={styles.heading}>New post</h1>
      <PostForm initial={emptyPostInput()} submitLabel="Create" onSubmit={onSubmit} />
    </div>
  );
}
