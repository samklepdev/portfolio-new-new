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
  content: text("content"),
  techDescription: text("tech_description"),
  techTabImage: text("tech_tab_image"),
  techTabImageAlt: text("tech_tab_image_alt"),
  designDescription: text("design_description"),
  designTabImage: text("design_tab_image"),
  designTabImageAlt: text("design_tab_image_alt"),
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
  postTags: many(postTags),
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

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  status: text("status").notNull().default("published"),
  featured: boolean("featured").notNull().default(false),
  publishedAt: date("published_at"),
  coverImage: text("cover_image"),
  content: text("content"),
  readingMinutes: integer("reading_minutes").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })]
);

export const postsRelations = relations(posts, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
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

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  background: text("background").notNull().default("#0b0e14"),
  foreground: text("foreground").notNull().default("#ffffff"),
  turquoise: text("turquoise").notNull().default("#00f0ff"),
  pink: text("pink").notNull().default("#ff2e97"),
  purple: text("purple").notNull().default("#b026ff"),
  green: text("green").notNull().default("#39ff88"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
