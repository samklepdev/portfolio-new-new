import { readingMinutes } from "../../lib/postFormat";

export const FEATURED_PROJECT_SLUGS: ReadonlySet<string> = new Set([
  "build-on",
  "gulf-winds",
  "otc",
]);

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function required(value: unknown, field: string, slug: string): string {
  const v = str(value);
  if (!v) throw new Error(`${slug}: missing required frontmatter field "${field}"`);
  return v;
}

export type ProjectImportRow = {
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  dateLabel: string | null;
  sortOrder: number;
  liveUrl: string | null;
  repoUrl: string | null;
  coverImage: string | null;
  featured: boolean;
  status: string;
  content: string;
  techDescription: string | null;
  techTabImage: string | null;
  techTabImageAlt: string | null;
  designDescription: string | null;
  designTabImage: string | null;
  designTabImageAlt: string | null;
  tech: { name: string; iconUrl: string | null }[];
};

export type PostImportRow = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  coverImage: string | null;
  featured: boolean;
  status: string;
  readingMinutes: number;
  content: string;
  tags: string[];
};

export function parseProjectRow(
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string
): ProjectImportRow {
  const fm = frontmatter;
  const title = required(fm.title, "title", slug);
  const summary = required(fm.excerpt, "excerpt", slug);

  const tech: ProjectImportRow["tech"] = [];
  for (let i = 1; i <= 5; i += 1) {
    const name = str(fm[`tech${i}Name`]);
    if (!name) continue;
    tech.push({ name, iconUrl: str(fm[`tech${i}`]) });
  }

  return {
    slug,
    title,
    summary,
    category: str(fm.category),
    dateLabel: str(fm.date),
    sortOrder: num(fm.id),
    liveUrl: str(fm.link),
    repoUrl: str(fm.repo),
    coverImage: str(fm.imageUrl),
    featured: FEATURED_PROJECT_SLUGS.has(slug),
    status: "published",
    content: body,
    techDescription: str(fm.techDescription),
    techTabImage: str(fm.techTabImg),
    techTabImageAlt: str(fm.techTabImgAlt),
    designDescription: str(fm.designDescription),
    designTabImage: str(fm.designTabImg),
    designTabImageAlt: str(fm.designTabImgAlt),
    tech,
  };
}

export function parsePostRow(
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string
): PostImportRow {
  const fm = frontmatter;
  const title = required(fm.title, "title", slug);
  const excerpt = required(fm.excerpt, "excerpt", slug);

  const tags = Array.isArray(fm.tags)
    ? fm.tags.map((tag) => str(tag)).filter((tag): tag is string => tag !== null)
    : [];

  return {
    slug,
    title,
    excerpt,
    publishedAt: str(fm.publishedAt),
    coverImage: str(fm.coverImage),
    featured: fm.featured === true,
    status: str(fm.status) ?? "published",
    readingMinutes: readingMinutes(body),
    content: body,
    tags,
  };
}
