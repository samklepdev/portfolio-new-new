import {
  pgTable,
  serial,
  text,
  boolean,
  date,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // matches content/projects/{slug}.mdx
  title: text("title").notNull(),
  summary: text("summary").notNull(), // short blurb for grid/cards
  status: text("status").notNull().default("published"), // draft | published | archived
  featured: boolean("featured").notNull().default(false),
  role: text("role"), // "Solo dev", "Lead", "Contract"
  category: text("category"), // industry, e.g. "Real Estate", "Food & Hospitality"
  // The content files carry a display string ("November 2025", "October 1,
  // 2022") rather than a real date. Kept verbatim so the site shows what the
  // author wrote; startedAt/completedAt stay available for actual dates.
  dateLabel: text("date_label"),
  // Mirrors the `id` in the content frontmatter — the ordering the old site
  // used. Higher is more recent.
  sortOrder: integer("sort_order").notNull().default(0),
  startedAt: date("started_at"),
  completedAt: date("completed_at"), // null = ongoing
  repoUrl: text("repo_url"),
  liveUrl: text("live_url"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // "TypeScript", "React", "C#"
  kind: text("kind").notNull(), // "language" | "framework" | "domain" | "tech"
  iconUrl: text("icon_url"), // e.g. /images/tech-icons/typescript.png
});

export const projectTags = pgTable(
  "project_tags",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.tagId] })]
);

// Per-project stat callouts, e.g. "10k users", "40% faster"
export const projectMetrics = pgTable("project_metrics", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Relations power the nested query in db/queries.ts (project -> tags -> metrics
// in one round trip instead of three separate queries).
export const projectsRelations = relations(projects, ({ many }) => ({
  projectTags: many(projectTags),
  metrics: many(projectMetrics),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  projectTags: many(projectTags),
}));

export const projectTagsRelations = relations(projectTags, ({ one }) => ({
  project: one(projects, {
    fields: [projectTags.projectId],
    references: [projects.id],
  }),
  tag: one(tags, {
    fields: [projectTags.tagId],
    references: [tags.id],
  }),
}));

export const projectMetricsRelations = relations(projectMetrics, ({ one }) => ({
  project: one(projects, {
    fields: [projectMetrics.projectId],
    references: [projects.id],
  }),
}));

/**
 * Messages from the home-page contact form.
 *
 * Standalone by design — no relations. This is the one table holding data the
 * site receives rather than publishes, so it is never joined to a project and
 * never read by a page.
 *
 * The row is the durable record. Email is best-effort and sent *after* the
 * insert, so a provider outage costs a notification rather than a message; the
 * outcome is written back to emailedAt/emailError instead of being assumed.
 *
 * No IP column, deliberately: storing visitor addresses is a privacy and
 * retention obligation, and the spam defence here is a honeypot plus a timing
 * check rather than per-IP limiting.
 */
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Null until a send succeeds. Both null = queued or never attempted.
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  emailError: text("email_error"),
});
