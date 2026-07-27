import { and, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import type { Article, Revision } from "../contract";
import { DatabaseTag } from "../db/layer";
import {
  articles as articlesTable,
  revisions as revisionsTable,
  wikis as wikisTable,
} from "../db/schema";

export interface ArticlesService {
  getArticle(wikiId: string, slug: string): Promise<{ article: Article; canEdit: boolean } | null>;
  createArticle(input: {
    wikiId: string;
    slug: string;
    title: string;
    content: unknown;
    authorId: string;
    canEdit?: boolean;
    signature?: string;
  }): Promise<Article>;
  updateArticle(input: {
    wikiId: string;
    slug: string;
    content: unknown;
    parentRevisionId: string;
    authorId: string;
    canEdit?: boolean;
    signature?: string;
  }): Promise<Article>;
  getHistory(
    articleId: string,
    cursor?: string,
  ): Promise<{
    revisions: Revision[];
    authors: Record<string, { name?: string }>;
    nextCursor: string | null;
  }>;
  listArticles(
    wikiId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    data: Article[];
    hasMore: boolean;
    nextCursor: string | null;
  }>;
  searchArticles(
    wikiId: string,
    q: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    data: Article[];
    hasMore: boolean;
    nextCursor: string | null;
  }>;
  getSitemapBatch(
    wikiId?: string,
    cursor?: string,
    limit?: number,
  ): Promise<{
    rows: { slug: string; updatedAt: string; subdomain: string }[];
    hasMore: boolean;
    nextCursor: string | null;
  }>;
}

export class ArticlesTag extends Context.Tag("api/Articles")<ArticlesService, ArticlesService>() {}

type ArticleRow = typeof articlesTable.$inferSelect;
type RevisionRow = typeof revisionsTable.$inferSelect;

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    wikiId: row.wikiId,
    slug: row.slug,
    title: row.title,
    content: row.content,
    currentRevisionId: row.currentRevisionId,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

function toRevision(row: RevisionRow): Revision {
  return {
    id: row.id,
    articleId: row.articleId,
    parentId: row.parentId,
    content: row.content,
    authorId: row.authorId,
    signature: row.signature,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

async function queryArticle(
  db: any,
  wikiId: string,
  slug: string,
): Promise<ArticleRow | undefined> {
  const rows = await db
    .select()
    .from(articlesTable)
    .where(and(eq(articlesTable.wikiId, wikiId), eq(articlesTable.slug, slug)))
    .limit(1);
  return rows[0];
}

function contentToString(content: unknown): string {
  if (!content) return "{}";
  if (typeof content === "string") return content;
  return JSON.stringify(content);
}

export const ArticlesLive = Layer.effect(
  ArticlesTag,
  Effect.gen(function* () {
    const db = yield* DatabaseTag;

    const service: ArticlesService = {
      getArticle: async (wikiId, slug) => {
        try {
          const article = await queryArticle(db, wikiId, slug);
          if (!article) return null;
          return { article: toArticle(article), canEdit: true };
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      createArticle: async (input) => {
        try {
          const result = await db.transaction(async (tx: any) => {
            const existing = await queryArticle(tx, input.wikiId, input.slug);
            if (existing) {
              throw new ORPCError("BAD_REQUEST", {
                message: "Article with this slug already exists",
                data: {
                  invalidFields: ["slug"],
                  validationErrors: [
                    {
                      field: "slug",
                      message: "An article with this slug already exists in this wiki",
                      code: "DUPLICATE",
                    },
                  ],
                },
              });
            }

            const contentJson = contentToString(input.content);

            const [article] = await tx
              .insert(articlesTable)
              .values({
                wikiId: input.wikiId,
                slug: input.slug,
                title: input.title,
                content: input.content as Record<string, unknown>,
              })
              .returning();

            if (!article) {
              throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create article" });
            }

            const [revision] = await tx
              .insert(revisionsTable)
              .values({
                articleId: article.id,
                parentId: null,
                content: contentJson,
                authorId: input.authorId,
                signature: input.signature ?? null,
              })
              .returning();

            if (!revision) {
              throw new ORPCError("INTERNAL_SERVER_ERROR", {
                message: "Failed to create initial revision",
              });
            }

            const [updated] = await tx
              .update(articlesTable)
              .set({ currentRevisionId: revision.id })
              .where(eq(articlesTable.id, article.id))
              .returning();

            if (!updated) {
              throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to link revision" });
            }

            return toArticle(updated);
          });

          return result;
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      updateArticle: async (input) => {
        try {
          const result = await db.transaction(async (tx: any) => {
            const [existing] = await tx
              .select()
              .from(articlesTable)
              .where(
                and(eq(articlesTable.wikiId, input.wikiId), eq(articlesTable.slug, input.slug)),
              )
              .limit(1);

            if (!existing) {
              throw new ORPCError("NOT_FOUND", {
                message: "Article not found",
                data: { resource: "article" },
              });
            }

            if (
              existing.currentRevisionId &&
              existing.currentRevisionId !== input.parentRevisionId
            ) {
              throw new ORPCError("BAD_REQUEST", {
                message: "Concurrent edit detected",
                data: {
                  invalidFields: ["parentRevisionId"],
                  validationErrors: [
                    {
                      field: "parentRevisionId",
                      message: "currentRevisionId does not match parentRevisionId",
                      code: "CONFLICT",
                    },
                  ],
                },
              });
            }

            const contentJson = contentToString(input.content);

            const [revision] = await tx
              .insert(revisionsTable)
              .values({
                articleId: existing.id,
                parentId: existing.currentRevisionId,
                content: contentJson,
                authorId: input.authorId,
                signature: input.signature ?? null,
              })
              .returning();

            if (!revision) {
              throw new ORPCError("INTERNAL_SERVER_ERROR", {
                message: "Failed to create revision",
              });
            }

            const [updated] = await tx
              .update(articlesTable)
              .set({
                content: input.content as Record<string, unknown>,
                currentRevisionId: revision.id,
                updatedAt: new Date(),
              })
              .where(eq(articlesTable.id, existing.id))
              .returning();

            if (!updated) {
              throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to update article" });
            }

            return toArticle(updated);
          });

          return result;
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      getHistory: async (articleId, cursor) => {
        try {
          const conditions = [eq(revisionsTable.articleId, articleId)];
          if (cursor) {
            conditions.push(gt(revisionsTable.createdAt, new Date(cursor)));
          }

          const rows: RevisionRow[] = await db
            .select()
            .from(revisionsTable)
            .where(and(...conditions))
            .orderBy(desc(revisionsTable.createdAt))
            .limit(51);

          const hasMore = rows.length > 50;
          const revisionRows = rows.slice(0, 50);
          const nextCursor =
            hasMore && revisionRows.length > 0
              ? (revisionRows[revisionRows.length - 1]?.createdAt?.toISOString() ?? null)
              : null;

          const authorIds = [...new Set(revisionRows.map((r) => r.authorId))];
          const authors: Record<string, { name?: string }> = {};
          for (const id of authorIds) {
            authors[id] = {};
          }

          return {
            revisions: revisionRows.map((r) => toRevision(r)),
            authors,
            nextCursor,
          };
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      listArticles: async (wikiId, cursor, limit = 20) => {
        try {
          const conditions = [eq(articlesTable.wikiId, wikiId)];
          if (cursor) {
            conditions.push(gt(articlesTable.updatedAt, new Date(cursor)));
          }

          const pageSize = limit + 1;
          const rows: ArticleRow[] = await db
            .select()
            .from(articlesTable)
            .where(and(...conditions))
            .orderBy(desc(articlesTable.updatedAt))
            .limit(pageSize);

          const hasMore = rows.length > limit;
          const data = rows.slice(0, limit);
          const nextCursor =
            hasMore && data.length > 0
              ? (data[data.length - 1]?.updatedAt.toISOString() ?? null)
              : null;

          return { data: data.map((r) => toArticle(r)), hasMore, nextCursor };
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      searchArticles: async (wikiId, q, cursor, limit = 25) => {
        try {
          const escapedQ = q.replace(/[%_]/g, (m) => `\\${m}`);
          const likePattern = `%${escapedQ}%`;

          const conditions = [
            eq(articlesTable.wikiId, wikiId),
            or(
              ilike(articlesTable.title, likePattern),
              ilike(articlesTable.slug, likePattern),
              sql`to_tsvector('english', coalesce(${articlesTable.content}::text, '')) @@ websearch_to_tsquery('english', ${q})`,
            ),
          ];
          if (cursor) {
            conditions.push(lt(articlesTable.updatedAt, new Date(cursor)));
          }

          const pageSize = limit + 1;
          const rows: ArticleRow[] = await db
            .select()
            .from(articlesTable)
            .where(and(...conditions))
            .orderBy(desc(articlesTable.updatedAt))
            .limit(pageSize);

          const hasMore = rows.length > limit;
          const data = rows.slice(0, limit);
          const nextCursor =
            hasMore && data.length > 0
              ? (data[data.length - 1]?.updatedAt.toISOString() ?? null)
              : null;

          return { data: data.map((r) => toArticle(r)), hasMore, nextCursor };
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      getSitemapBatch: async (wikiId, cursor, limit = 100) => {
        try {
          const conditions: any[] = [];
          if (wikiId) {
            conditions.push(eq(articlesTable.wikiId, wikiId));
          }
          if (cursor) {
            conditions.push(gt(articlesTable.updatedAt, new Date(cursor)));
          }

          const pageSize = limit + 1;
          const rows = await db
            .select({
              slug: articlesTable.slug,
              updatedAt: articlesTable.updatedAt,
              subdomain: wikisTable.subdomain,
            })
            .from(articlesTable)
            .innerJoin(wikisTable, eq(articlesTable.wikiId, wikisTable.id))
            .where(and(...conditions))
            .orderBy(desc(articlesTable.updatedAt))
            .limit(pageSize);

          const hasMore = rows.length > limit;
          const data = rows.slice(0, limit);

          return {
            rows: data.map((r: { slug: string; updatedAt: Date; subdomain: string }) => ({
              slug: r.slug,
              updatedAt:
                r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
              subdomain: r.subdomain,
            })),
            hasMore,
            nextCursor:
              hasMore && data.length > 0
                ? (data[data.length - 1]?.updatedAt.toISOString() ?? null)
                : null,
          };
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },
    };

    return service;
  }),
);
