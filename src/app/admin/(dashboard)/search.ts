import type {
  PostRowDTO,
  ProjectRowDTO,
  SubmissionRowDTO,
  TagListRowDTO,
} from "@/services/types";

export type ResultType = "project" | "post" | "tag" | "submission";

export interface ResultItem {
  /** Unique, stable id for React keys and aria option ids. */
  key: string;
  type: ResultType;
  id: number;
  label: string;
  sublabel: string;
  href: string;
}

export interface ResultGroup {
  type: ResultType;
  heading: string;
  items: ResultItem[];
  /** Pre-cap match count, for the "+N more" affordance. */
  total: number;
  moreHref: string;
}

export interface SearchData {
  projects: ProjectRowDTO[];
  posts: PostRowDTO[];
  tags: TagListRowDTO[];
  submissions: SubmissionRowDTO[];
}

export const PER_GROUP_CAP = 5;

// Fixed display order and per-type metadata.
const GROUP_ORDER: ResultType[] = ["project", "post", "tag", "submission"];
const GROUP_META: Record<ResultType, { heading: string; moreHref: string }> = {
  project: { heading: "Projects", moreHref: "/admin/projects" },
  post: { heading: "Posts", moreHref: "/admin/posts" },
  tag: { heading: "Tags", moreHref: "/admin/tags" },
  submission: { heading: "Submissions", moreHref: "/admin/submissions" },
};

export function buildResultItems(data: SearchData): ResultItem[] {
  const items: ResultItem[] = [];

  for (const p of data.projects) {
    items.push({
      key: `project-${p.id}`,
      type: "project",
      id: p.id,
      label: p.title,
      sublabel: `/${p.slug}`,
      href: `/admin/projects/${p.id}/edit`,
    });
  }
  for (const p of data.posts) {
    items.push({
      key: `post-${p.id}`,
      type: "post",
      id: p.id,
      label: p.title,
      sublabel: `/${p.slug}`,
      href: `/admin/posts/${p.id}/edit`,
    });
  }
  for (const t of data.tags) {
    items.push({
      key: `tag-${t.id}`,
      type: "tag",
      id: t.id,
      label: t.name,
      sublabel: t.kind,
      // Tags are edited inline on the list; there is no per-tag page.
      href: "/admin/tags",
    });
  }
  for (const s of data.submissions) {
    items.push({
      key: `submission-${s.id}`,
      type: "submission",
      id: s.id,
      label: s.name,
      sublabel: s.email,
      href: `/admin/submissions/${s.id}`,
    });
  }

  return items;
}

export function filterResults(
  items: ResultItem[],
  query: string,
  cap: number = PER_GROUP_CAP,
): ResultGroup[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];

  const matched = items.filter((item) =>
    `${item.label} ${item.sublabel}`.toLowerCase().includes(q),
  );

  const groups: ResultGroup[] = [];
  for (const type of GROUP_ORDER) {
    const ofType = matched.filter((item) => item.type === type);
    if (ofType.length === 0) continue;
    groups.push({
      type,
      heading: GROUP_META[type].heading,
      items: ofType.slice(0, cap),
      total: ofType.length,
      moreHref: GROUP_META[type].moreHref,
    });
  }

  return groups;
}
