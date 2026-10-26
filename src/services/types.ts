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

// Row shapes the API returns (client-side view; dates arrive as ISO strings
// over JSON). Kept loose on timestamps since the client only displays them.
export type TagRowDTO = { id: number; name: string; kind: string; iconUrl: string | null };

// listTags enriches each tag with how many projects/posts reference it, so the
// admin can see a tag's blast radius before deleting it (deletes cascade).
export type TagListRowDTO = TagRowDTO & { projectCount: number; postCount: number };

export type ProjectRowDTO = ProjectInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type PostRowDTO = PostInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionRowDTO = {
  id: number;
  name: string;
  email: string;
  budget: string | null;
  website: string | null;
  message: string;
  createdAt: string;
  emailedAt: string | null;
  emailError: string | null;
};

export type ThemeInput = {
  name: string;
  background: string;
  foreground: string;
  turquoise: string;
  pink: string;
  purple: string;
  green: string;
};

export type ThemeRowDTO = ThemeInput & {
  id: number;
  isActive: boolean;
};
