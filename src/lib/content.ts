import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "projects");
const CONTENT_EXT = ".md";

export type ProjectContent = {
  /** Raw markdown body, frontmatter stripped. */
  body: string;
  /** Frontmatter — title, excerpt, category, link, tech icons and so on. */
  frontmatter: Record<string, unknown>;
};

/**
 * Reads src/content/projects/{slug}.md.
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
    const raw = await readFile(
      path.join(CONTENT_DIR, `${slug}${CONTENT_EXT}`),
      "utf8"
    );
    const { content, data } = matter(raw);
    return { body: content, frontmatter: data };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * Returns the URL only if the file actually exists under public/.
 *
 * The content frontmatter references screenshots (/images/screenshots/…) that
 * are not in the repo yet. Checking first means a page with missing artwork
 * renders without it, rather than showing a column of broken-image icons — and
 * starts showing them the moment the files are added, with no code change.
 */
export async function resolvePublicImage(
  url: unknown
): Promise<string | null> {
  if (typeof url !== "string" || !url.startsWith("/")) return null;

  const filePath = path.join(PUBLIC_DIR, url);
  // Reject anything that escapes public/ via ../ in the frontmatter.
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return null;

  try {
    await access(filePath);
    return url;
  } catch {
    return null;
  }
}

/**
 * Slugs that actually have a content file. Used by generateStaticParams so the
 * build never prerenders a detail page whose content does not exist yet.
 */
export async function getContentSlugs(): Promise<string[]> {
  try {
    const files = await readdir(CONTENT_DIR);
    return files
      .filter((file) => file.endsWith(CONTENT_EXT))
      .map((file) => file.slice(0, -CONTENT_EXT.length));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
