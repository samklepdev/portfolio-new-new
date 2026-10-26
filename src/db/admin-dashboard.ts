import { and, count, desc, gte, isNotNull, isNull } from "drizzle-orm";
import { db } from "./index";
import { contactSubmissions, posts, projects, tags } from "./schema";

export type DashboardStats = {
  projects: { total: number; published: number; draft: number };
  posts: { total: number; published: number; draft: number };
  submissionsLast30Days: number;
  recentSubmissions: { id: number; name: string; email: string; createdAt: Date }[];
  email: { delivered: number; failed: number; pending: number };
  tags: { tech: number; topic: number };
};

// A content row is "published" when status = 'published'; everything else
// (currently only 'draft') counts as draft.
function splitByStatus(rows: { status: string; n: number }[]) {
  let total = 0;
  let published = 0;
  for (const r of rows) {
    total += r.n;
    if (r.status === "published") published += r.n;
  }
  return { total, published, draft: total - published };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    projectStatus,
    postStatus,
    recent,
    recentCount,
    delivered,
    failed,
    pending,
    tagKinds,
  ] = await Promise.all([
    db.select({ status: projects.status, n: count() }).from(projects).groupBy(projects.status),
    db.select({ status: posts.status, n: count() }).from(posts).groupBy(posts.status),
    db
      .select({
        id: contactSubmissions.id,
        name: contactSubmissions.name,
        email: contactSubmissions.email,
        createdAt: contactSubmissions.createdAt,
      })
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt), desc(contactSubmissions.id))
      .limit(5),
    db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(gte(contactSubmissions.createdAt, since)),
    db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(and(isNotNull(contactSubmissions.emailedAt), isNull(contactSubmissions.emailError))),
    db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(isNotNull(contactSubmissions.emailError)),
    db
      .select({ n: count() })
      .from(contactSubmissions)
      .where(and(isNull(contactSubmissions.emailedAt), isNull(contactSubmissions.emailError))),
    db.select({ kind: tags.kind, n: count() }).from(tags).groupBy(tags.kind),
  ]);

  const tagByKind = new Map(tagKinds.map((t) => [t.kind, t.n]));

  return {
    projects: splitByStatus(projectStatus),
    posts: splitByStatus(postStatus),
    submissionsLast30Days: recentCount[0]?.n ?? 0,
    recentSubmissions: recent,
    email: {
      delivered: delivered[0]?.n ?? 0,
      failed: failed[0]?.n ?? 0,
      pending: pending[0]?.n ?? 0,
    },
    tags: { tech: tagByKind.get("tech") ?? 0, topic: tagByKind.get("topic") ?? 0 },
  };
}
