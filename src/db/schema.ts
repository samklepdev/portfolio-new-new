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
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull().default("published"),
  featured: boolean("featured").notNull().default(false),
  role: text("role"),
  category: text("category"),
  dateLabel: text("date_label"),
  sortOrder: integer("sort_order").notNull().default(0),
  startedAt: date("started_at"),
  completedAt: date("completed_at"),
  repoUrl: text("repo_url"),
  liveUrl: text("live_url"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  kind: text("kind").notNull(),
  iconUrl: text("icon_url"),
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

export const projectMetrics = pgTable("project_metrics", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

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

export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  budget: text("budget"),
  website: text("website"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  emailError: text("email_error"),
});
