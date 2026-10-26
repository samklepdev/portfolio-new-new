"use client";

import { useState, type FormEvent } from "react";
import type { ProjectInput, Tech } from "@/services/types";
import { ApiError } from "@/services/ApiError";
import {
  TextField, TextAreaField, CheckboxField, NumberField, SelectField, DateField,
} from "./FormFields";
import styles from "./editor.module.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export function emptyProjectInput(): ProjectInput {
  return {
    slug: "", title: "", summary: "", status: "draft", featured: false,
    category: null, role: null, dateLabel: null, sortOrder: 0,
    startedAt: null, completedAt: null, liveUrl: null, repoUrl: null,
    coverImage: null, content: null,
    techDescription: null, techTabImage: null, techTabImageAlt: null,
    designDescription: null, designTabImage: null, designTabImageAlt: null,
    tech: [],
  };
}

const s = (v: string | null) => v ?? "";
const nn = (v: string) => (v.trim() === "" ? null : v.trim());

export default function ProjectForm({
  initial, submitLabel, onSubmit,
}: {
  initial: ProjectInput;
  submitLabel: string;
  onSubmit: (input: ProjectInput) => Promise<void>;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [status, setStatus] = useState(initial.status);
  const [featured, setFeatured] = useState(initial.featured);
  const [category, setCategory] = useState(s(initial.category));
  const [role, setRole] = useState(s(initial.role));
  const [dateLabel, setDateLabel] = useState(s(initial.dateLabel));
  const [sortOrder, setSortOrder] = useState(initial.sortOrder);
  const [startedAt, setStartedAt] = useState(s(initial.startedAt));
  const [completedAt, setCompletedAt] = useState(s(initial.completedAt));
  const [liveUrl, setLiveUrl] = useState(s(initial.liveUrl));
  const [repoUrl, setRepoUrl] = useState(s(initial.repoUrl));
  const [coverImage, setCoverImage] = useState(s(initial.coverImage));
  const [content, setContent] = useState(s(initial.content));
  const [techDescription, setTechDescription] = useState(s(initial.techDescription));
  const [techTabImage, setTechTabImage] = useState(s(initial.techTabImage));
  const [techTabImageAlt, setTechTabImageAlt] = useState(s(initial.techTabImageAlt));
  const [designDescription, setDesignDescription] = useState(s(initial.designDescription));
  const [designTabImage, setDesignTabImage] = useState(s(initial.designTabImage));
  const [designTabImageAlt, setDesignTabImageAlt] = useState(s(initial.designTabImageAlt));
  const [tech, setTech] = useState<Tech[]>(initial.tech);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function setTechAt(i: number, patch: Partial<Tech>) {
    setTech((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const input: ProjectInput = {
      slug: slug.trim(), title: title.trim(), summary: summary.trim(),
      status, featured, category: nn(category), role: nn(role), dateLabel: nn(dateLabel),
      sortOrder, startedAt: nn(startedAt), completedAt: nn(completedAt),
      liveUrl: nn(liveUrl), repoUrl: nn(repoUrl), coverImage: nn(coverImage), content: nn(content),
      techDescription: nn(techDescription), techTabImage: nn(techTabImage), techTabImageAlt: nn(techTabImageAlt),
      designDescription: nn(designDescription), designTabImage: nn(designTabImage), designTabImageAlt: nn(designTabImageAlt),
      tech: tech.filter((t) => t.name.trim() !== "").map((t) => ({ name: t.name.trim(), iconUrl: nn(t.iconUrl ?? "") })),
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
      <TextAreaField id="summary" label="Summary" value={summary} onChange={setSummary} />
      <div className={styles.row}>
        <TextField id="category" label="Category" value={category} onChange={setCategory} />
        <TextField id="role" label="Role" value={role} onChange={setRole} />
        <TextField id="dateLabel" label="Date label" value={dateLabel} onChange={setDateLabel} />
        <NumberField id="sortOrder" label="Sort order" value={sortOrder} onChange={setSortOrder} />
      </div>
      <div className={styles.row}>
        <DateField id="startedAt" label="Started at" value={startedAt} onChange={setStartedAt} />
        <DateField id="completedAt" label="Completed at" value={completedAt} onChange={setCompletedAt} />
      </div>
      <div className={styles.row}>
        <TextField id="liveUrl" label="Live URL" value={liveUrl} onChange={setLiveUrl} />
        <TextField id="repoUrl" label="Repo URL" value={repoUrl} onChange={setRepoUrl} />
        <TextField id="coverImage" label="Cover image" value={coverImage} onChange={setCoverImage} />
      </div>
      <CheckboxField id="featured" label="Featured" checked={featured} onChange={setFeatured} />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Detail-page tabs</legend>
        <TextAreaField id="techDescription" label="Tech description" value={techDescription} onChange={setTechDescription} />
        <div className={styles.row}>
          <TextField id="techTabImage" label="Tech tab image" value={techTabImage} onChange={setTechTabImage} />
          <TextField id="techTabImageAlt" label="Tech tab image alt" value={techTabImageAlt} onChange={setTechTabImageAlt} />
        </div>
        <TextAreaField id="designDescription" label="Design description" value={designDescription} onChange={setDesignDescription} />
        <div className={styles.row}>
          <TextField id="designTabImage" label="Design tab image" value={designTabImage} onChange={setDesignTabImage} />
          <TextField id="designTabImageAlt" label="Design tab image alt" value={designTabImageAlt} onChange={setDesignTabImageAlt} />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Tech stack</legend>
        {tech && tech.map((t, i) => (
          <div className={styles.repeatRow} key={i}>
            <input aria-label={`Tech name ${i + 1}`} placeholder="Name" value={t.name}
              onChange={(e) => setTechAt(i, { name: e.target.value })} />
            <input aria-label={`Tech icon URL ${i + 1}`} placeholder="Icon URL (optional)" value={t.iconUrl ?? ""}
              onChange={(e) => setTechAt(i, { iconUrl: e.target.value })} />
            <button type="button" className={styles.ghost}
              onClick={() => setTech((rows) => rows.filter((_, idx) => idx !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className={styles.ghost}
          onClick={() => setTech((rows) => [...rows, { name: "", iconUrl: null }])}>Add tech</button>
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
