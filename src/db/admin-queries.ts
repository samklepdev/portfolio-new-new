import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { contactSubmissions, posts, projects, tags } from "./schema";

export type ProjectRow = typeof projects.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type SubmissionRow = typeof contactSubmissions.$inferSelect;

// NULLs sort first on DESC in Postgres; `nulls last` + a stable id tiebreak
// keeps draft/undated rows from floating to the top.
const projectOrder = [
  sql`${projects.startedAt} desc nulls last`,
  desc(projects.sortOrder),
  asc(projects.id),
];

export async function listProjects() {
  return db.query.projects.findMany({
    orderBy: projectOrder,
    with: { projectTags: { with: { tag: true } } },
  });
}

export async function getProjectById(id: number) {
  const row = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { projectTags: { with: { tag: true } } },
  });
  return row ?? null;
}

const postOrder = [sql`${posts.publishedAt} desc nulls last`, asc(posts.id)];

export async function listPosts() {
  return db.query.posts.findMany({
    orderBy: postOrder,
    with: { postTags: { with: { tag: true } } },
  });
}

export async function getPostById(id: number) {
  const row = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: { postTags: { with: { tag: true } } },
  });
  return row ?? null;
}

export async function listTags(): Promise<TagRow[]> {
  return db.query.tags.findMany({ orderBy: [asc(tags.kind), asc(tags.name)] });
}

export async function getTagById(id: number): Promise<TagRow | null> {
  const row = await db.query.tags.findFirst({ where: eq(tags.id, id) });
  return row ?? null;
}

export async function listSubmissions(): Promise<SubmissionRow[]> {
  return db.query.contactSubmissions.findMany({
    orderBy: [desc(contactSubmissions.createdAt), desc(contactSubmissions.id)],
  });
}

export async function getSubmissionById(id: number): Promise<SubmissionRow | null> {
  const row = await db.query.contactSubmissions.findFirst({
    where: eq(contactSubmissions.id, id),
  });
  return row ?? null;
}
