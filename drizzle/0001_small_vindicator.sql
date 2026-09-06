ALTER TABLE "projects" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "date_label" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "icon_url" text;