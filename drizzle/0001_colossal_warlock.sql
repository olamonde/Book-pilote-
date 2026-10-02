CREATE TABLE "books" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '',
	"description" text DEFAULT '',
	"author" text DEFAULT '',
	"language" text DEFAULT 'Français',
	"genre" text DEFAULT 'Guide Pratique',
	"tone" text DEFAULT 'Inspirant & Professionnel',
	"target_audience" text DEFAULT 'Tout public',
	"status" text DEFAULT 'draft' NOT NULL,
	"cover" jsonb NOT NULL,
	"chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "books_user_id_idx" ON "books" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "books_updated_at_idx" ON "books" USING btree ("updated_at");