CREATE TABLE IF NOT EXISTS "themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"background" text DEFAULT '#0b0e14' NOT NULL,
	"foreground" text DEFAULT '#ffffff' NOT NULL,
	"turquoise" text DEFAULT '#00f0ff' NOT NULL,
	"pink" text DEFAULT '#ff2e97' NOT NULL,
	"purple" text DEFAULT '#b026ff' NOT NULL,
	"green" text DEFAULT '#39ff88' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "themes_name_unique" UNIQUE("name")
);
