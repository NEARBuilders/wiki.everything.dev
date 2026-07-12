CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wiki_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb,
	"current_revision_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"author_id" text NOT NULL,
	"signature" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wikis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subdomain" text NOT NULL,
	"account_id" text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wikis_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "wikis_account_id_unique" UNIQUE("account_id"),
	CONSTRAINT "wikis_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_wiki_slug_idx" ON "articles" USING btree ("wiki_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "revisions_article_created_idx" ON "revisions" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wikis_subdomain_idx" ON "wikis" USING btree ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX "wikis_account_id_idx" ON "wikis" USING btree ("account_id");