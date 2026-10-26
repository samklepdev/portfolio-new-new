"use client";

import { useState, type FormEvent } from "react";
import type { PostInput } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import {
  TextField, TextAreaField, CheckboxField, NumberField, SelectField, DateField,
} from "./FormFields";
import styles from "./editor.module.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export function emptyPostInput(): PostInput {
  return {
    slug: "", title: "", excerpt: "", status: "draft", featured: false,
    publishedAt: null, coverImage: null, content: null, readingMinutes: 1, tags: [],
  };
}

const s = (v: string | null) => v ?? "";
const nn = (v: string) => (v.trim() === "" ? null : v.trim());

export default function PostForm({
  initial, submitLabel, onSubmit,
}: {
  initial: PostInput;
  submitLabel: string;
  onSubmit: (input: PostInput) => Promise<void>;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [title, setTitle] = useState(initial.title);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [status, setStatus] = useState(initial.status);
  const [featured, setFeatured] = useState(initial.featured);
  const [publishedAt, setPublishedAt] = useState(s(initial.publishedAt));
  const [coverImage, setCoverImage] = useState(s(initial.coverImage));
  const [content, setContent] = useState(s(initial.content));
  const [readingMinutes, setReadingMinutes] = useState(initial.readingMinutes);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function addTag() {
    const t = tagDraft.trim();
    if (t === "" || tags.includes(t)) {
      setTagDraft("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const input: PostInput = {
      slug: slug.trim(), title: title.trim(), excerpt: excerpt.trim(),
      status, featured, publishedAt: nn(publishedAt), coverImage: nn(coverImage),
      content: nn(content), readingMinutes, tags,
    };
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <TextField id="slug" label="Slug" value={slug} onChange={setSlug} required />
        <SelectField id="status" label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>
      <TextField id="title" label="Title" value={title} onChange={setTitle} required />
      <TextAreaField id="excerpt" label="Excerpt" value={excerpt} onChange={setExcerpt} />
      <div className={styles.row}>
        <DateField id="publishedAt" label="Published at" value={publishedAt} onChange={setPublishedAt} />
        <TextField id="coverImage" label="Cover image" value={coverImage} onChange={setCoverImage} />
        <NumberField id="readingMinutes" label="Reading minutes" value={readingMinutes} onChange={setReadingMinutes} />
      </div>
      <CheckboxField id="featured" label="Featured" checked={featured} onChange={setFeatured} />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Topic tags</legend>
        <div className={styles.repeatRow}>
          {tags && tags.map((t) => (
            <button type="button" key={t} className={styles.ghost}
              onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>{t} ✕</button>
          ))}
        </div>
        <div className={styles.repeatRow}>
          <input aria-label="Add tag" placeholder="Add tag" value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
          <button type="button" className={styles.ghost} onClick={addTag}>Add tag</button>
        </div>
      </fieldset>

      <TextAreaField id="content" label="Content (MDX)" value={content} onChange={setContent} mono />

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
