import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "projects");
const CONTENT_EXT = ".md";

export type ProjectContent = {
  body: string;
  frontmatter: Record<string, unknown>;
};

export async function getProjectContent(
  slug: string
): Promise<ProjectContent | null> {
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
