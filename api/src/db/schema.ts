import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const wikis = pgTable(
  "wikis",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subdomain: text("subdomain").notNull().unique(),
    accountId: text("account_id").notNull().unique(),
    orgId: text("org_id").notNull().unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subdomainIdx: uniqueIndex("wikis_subdomain_idx").on(table.subdomain),
    accountIdIdx: uniqueIndex("wikis_account_id_idx").on(table.accountId),
  }),
);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    wikiId: uuid("wiki_id")
      .notNull()
      .references(() => wikis.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    content: jsonb("content"),
    currentRevisionId: uuid("current_revision_id"),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    wikiSlugIdx: uniqueIndex("articles_wiki_slug_idx").on(table.wikiId, table.slug),
    contentFtsIdx: index("articles_content_fts_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${table.content}::text, ''))`,
    ),
  }),
);

export const revisions = pgTable(
  "revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    content: text("content").notNull(),
    authorId: text("author_id").notNull(),
    signature: text("signature"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    articleCreatedAtIdx: uniqueIndex("revisions_article_created_idx").on(
      table.articleId,
      table.createdAt,
    ),
  }),
);
