import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content", "projects");

export type ProjectContent = {
  /** Raw MDX body, frontmatter stripped. */
  body: string;
  /** Frontmatter. Only `slug` is expected — everything else lives in Postgres. */
  frontmatter: Record<string, unknown>;
};

/**
 * Reads content/projects/{slug}.mdx.
 *
 * Returns null when the file does not exist, rather than throwing: a published
 * row without a matching file is a content/database drift problem for the
 * caller to handle (404), not an exception. Any other read error — a permission
 * problem, a malformed file — still throws, because silently treating those as
 * "missing" would hide real breakage.
 */
export async function getProjectContent(
  slug: string
): Promise<ProjectContent | null> {
  // Guard against a slug from the URL escaping the content directory.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  try {
    const raw = await readFile(path.join(CONTENT_DIR, `${slug}.mdx`), "utf8");
    const { content, data } = matter(raw);
    return { body: content, frontmatter: data };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Slugs that actually have an MDX file. Used by generateStaticParams so the
 * build never prerenders a detail page whose content does not exist yet.
 */
export async function getContentSlugs(): Promise<string[]> {
  try {
    const files = await readdir(CONTENT_DIR);
    return files
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
