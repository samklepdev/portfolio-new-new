import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type Collection = "projects" | "posts";

const CONTENT_ROOT = path.join(process.cwd(), "src", "content");
const CONTENT_EXT = ".md";

export type ContentFile = {
  body: string;
  frontmatter: Record<string, unknown>;
};

function collectionDir(collection: Collection): string {
  return path.join(CONTENT_ROOT, collection);
}

export async function getContent(
  collection: Collection,
  slug: string
): Promise<ContentFile | null> {
  // The slug reaches this from a URL segment. Anything outside [a-z0-9-]
  // is rejected before it can become a path — no traversal, no absolute paths.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  try {
    const raw = await readFile(
      path.join(collectionDir(collection), `${slug}${CONTENT_EXT}`),
      "utf8"
    );
    const { content, data } = matter(raw);
    return { body: content, frontmatter: data };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function getProjectContent(slug: string): Promise<ContentFile | null> {
  return getContent("projects", slug);
}

export function getPostContent(slug: string): Promise<ContentFile | null> {
  return getContent("posts", slug);
}

const PUBLIC_DIR = path.join(process.cwd(), "public");

export async function resolvePublicImage(
  url: unknown
): Promise<string | null> {
  if (typeof url !== "string" || !url.startsWith("/")) return null;

  const filePath = path.join(PUBLIC_DIR, url);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return null;

  try {
    await access(filePath);
    return url;
  } catch {
    return null;
  }
}

export async function getContentSlugs(
  collection: Collection
): Promise<string[]> {
  try {
    const files = await readdir(collectionDir(collection));
    return files
      .filter((file) => file.endsWith(CONTENT_EXT))
      .map((file) => file.slice(0, -CONTENT_EXT.length));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
