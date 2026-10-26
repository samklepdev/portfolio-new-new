// Wire types shared by the admin services and the route validators.
// Rows returned by the API; inputs accepted by create/update.

export type Tech = { name: string; iconUrl: string | null };

export type ProjectInput = {
  slug: string;
  title: string;
  summary: string;
  status: string;
  featured: boolean;
  category: string | null;
  role: string | null;
  dateLabel: string | null;
  sortOrder: number;
  startedAt: string | null;
  completedAt: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  coverImage: string | null;
  content: string | null;
  techDescription: string | null;
  techTabImage: string | null;
  techTabImageAlt: string | null;
  designDescription: string | null;
  designTabImage: string | null;
  designTabImageAlt: string | null;
  tech: Tech[];
};

export type PostInput = {
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  featured: boolean;
  publishedAt: string | null;
  coverImage: string | null;
  content: string | null;
  readingMinutes: number;
  tags: string[];
};

export type TagInput = {
  name: string;
  kind: string;
  iconUrl: string | null;
};
