import type { ProjectInput, PostInput, TagInput, Tech, ThemeInput } from "@/services/types";
import { HERO_PRESETS, DEFAULT_HERO_PRESET, isHeroPreset } from "@/lib/heroPresets";

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const SLUG_RE = /^[a-z0-9-]+$/;
const TAG_KINDS = new Set(["tech", "topic"]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function reqStr(obj: Record<string, unknown>, field: string): string | { error: string } {
  const v = str(obj[field]);
  return v ?? { error: `Missing or empty "${field}"` };
}

function optStr(obj: Record<string, unknown>, field: string): string | null {
  return str(obj[field]);
}

function optBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function optNum(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function parseId(param: string): number | null {
  if (!/^[1-9][0-9]*$/.test(param)) return null;
  const n = Number(param);
  return Number.isSafeInteger(n) ? n : null;
}

export function parseProjectInput(body: unknown): Validated<ProjectInput> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };

  const title = reqStr(body, "title");
  if (typeof title !== "string") return { ok: false, error: title.error };
  const summary = reqStr(body, "summary");
  if (typeof summary !== "string") return { ok: false, error: summary.error };
  const slug = reqStr(body, "slug");
  if (typeof slug !== "string") return { ok: false, error: slug.error };
  if (!SLUG_RE.test(slug)) return { ok: false, error: `Invalid slug "${slug}" (use a-z 0-9 -)` };

  const tech: Tech[] = Array.isArray(body.tech)
    ? body.tech
        .filter(isObject)
        .map((t) => ({ name: str(t.name), iconUrl: str(t.iconUrl) }))
        .filter((t): t is Tech => t.name !== null)
    : [];

  return {
    ok: true,
    value: {
      slug,
      title,
      summary,
      status: optStr(body, "status") ?? "published",
      featured: optBool(body.featured, false),
      category: optStr(body, "category"),
      role: optStr(body, "role"),
      dateLabel: optStr(body, "dateLabel"),
      sortOrder: optNum(body.sortOrder, 0),
      startedAt: optStr(body, "startedAt"),
      completedAt: optStr(body, "completedAt"),
      liveUrl: optStr(body, "liveUrl"),
      repoUrl: optStr(body, "repoUrl"),
      coverImage: optStr(body, "coverImage"),
      content: optStr(body, "content"),
      techDescription: optStr(body, "techDescription"),
      techTabImage: optStr(body, "techTabImage"),
      techTabImageAlt: optStr(body, "techTabImageAlt"),
      designDescription: optStr(body, "designDescription"),
      designTabImage: optStr(body, "designTabImage"),
      designTabImageAlt: optStr(body, "designTabImageAlt"),
      tech,
    },
  };
}

export function parsePostInput(body: unknown): Validated<PostInput> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };

  const title = reqStr(body, "title");
  if (typeof title !== "string") return { ok: false, error: title.error };
  const excerpt = reqStr(body, "excerpt");
  if (typeof excerpt !== "string") return { ok: false, error: excerpt.error };
  const slug = reqStr(body, "slug");
  if (typeof slug !== "string") return { ok: false, error: slug.error };
  if (!SLUG_RE.test(slug)) return { ok: false, error: `Invalid slug "${slug}" (use a-z 0-9 -)` };

  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.map((t) => str(t)).filter((t): t is string => t !== null)
    : [];

  return {
    ok: true,
    value: {
      slug,
      title,
      excerpt,
      status: optStr(body, "status") ?? "published",
      featured: optBool(body.featured, false),
      publishedAt: optStr(body, "publishedAt"),
      coverImage: optStr(body, "coverImage"),
      content: optStr(body, "content"),
      readingMinutes: optNum(body.readingMinutes, 1),
      tags,
    },
  };
}

export function parseTagInput(body: unknown): Validated<TagInput> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };
  const name = reqStr(body, "name");
  if (typeof name !== "string") return { ok: false, error: name.error };
  const kind = reqStr(body, "kind");
  if (typeof kind !== "string") return { ok: false, error: kind.error };
  if (!TAG_KINDS.has(kind)) return { ok: false, error: `Invalid kind "${kind}" (tech|topic)` };
  return { ok: true, value: { name, kind, iconUrl: optStr(body, "iconUrl") } };
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const THEME_COLORS = [
  "background",
  "foreground",
  "turquoise",
  "pink",
  "purple",
  "green",
] as const;

export function parseThemeInput(body: unknown): Validated<ThemeInput> {
  if (!isObject(body)) return { ok: false, error: "Body must be an object" };

  const name = reqStr(body, "name");
  if (typeof name !== "string") return { ok: false, error: name.error };

  const colors = {} as Record<(typeof THEME_COLORS)[number], string>;
  for (const field of THEME_COLORS) {
    const value = reqStr(body, field);
    if (typeof value !== "string") return { ok: false, error: value.error };
    if (!HEX_RE.test(value)) {
      return { ok: false, error: `Invalid hex colour for "${field}": "${value}"` };
    }
    colors[field] = value;
  }

  const rawPreset = (body as Record<string, unknown>).heroPreset;
  let heroPreset: string = DEFAULT_HERO_PRESET;
  if (rawPreset !== undefined) {
    if (!isHeroPreset(rawPreset)) {
      return { ok: false, error: `Invalid hero preset: "${String(rawPreset)}" (expected one of ${HERO_PRESETS.join(", ")})` };
    }
    heroPreset = rawPreset;
  }

  return { ok: true, value: { name, ...colors, heroPreset } };
}
