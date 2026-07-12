import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, UNAUTHORIZED } from "every-plugin/errors";
import { eventIterator, oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";

export const WikiSchema = z.object({
  id: z.string(),
  subdomain: z.string(),
  accountId: z.string(),
  orgId: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export type Wiki = z.infer<typeof WikiSchema>;

export const ArticleSchema = z.object({
  id: z.string(),
  wikiId: z.string(),
  slug: z.string(),
  title: z.string(),
  content: z.unknown().nullable(),
  currentRevisionId: z.string().nullable(),
  updatedAt: z.string(),
});

export type Article = z.infer<typeof ArticleSchema>;

export const RevisionSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  parentId: z.string().nullable(),
  content: z.string(),
  authorId: z.string(),
  signature: z.string().nullable(),
  createdAt: z.string(),
});

export type Revision = z.infer<typeof RevisionSchema>;

export const SitemapEntrySchema = z.object({
  slug: z.string(),
  updatedAt: z.string(),
  subdomain: z.string(),
});

export type SitemapEntry = z.infer<typeof SitemapEntrySchema>;

export const contract = oc.router({
  ping: oc.route({ method: "GET", path: "/ping" }).output(
    z.object({
      status: z.literal("ok"),
      timestamp: z.iso.datetime(),
    }),
  ),

  authHealth: oc
    .route({ method: "GET", path: "/auth/health" })
    .output(
      z.object({
        status: z.string(),
        emailConfigured: z.boolean(),
        smsConfigured: z.boolean(),
      }),
    )
    .errors({ UNAUTHORIZED }),

  createWiki: oc
    .route({ method: "POST", path: "/wikis" })
    .input(
      z.object({
        subdomain: z.string(),
        name: z.string(),
        accountId: z.string(),
        orgId: z.string(),
      }),
    )
    .output(WikiSchema)
    .errors({ UNAUTHORIZED, BAD_REQUEST }),

  deleteWiki: oc
    .route({ method: "DELETE", path: "/wikis/{wikiId}" })
    .input(z.object({ wikiId: z.string() }))
    .output(z.object({ deleted: z.boolean() }))
    .errors({ UNAUTHORIZED, FORBIDDEN, NOT_FOUND }),

  resolveWiki: oc
    .route({ method: "GET", path: "/wikis/account/{accountId}" })
    .input(z.object({ accountId: z.string() }))
    .output(WikiSchema)
    .errors({ NOT_FOUND }),

  getArticle: oc
    .route({ method: "GET", path: "/articles/{wikiId}/{slug}" })
    .input(z.object({ wikiId: z.string(), slug: z.string() }))
    .output(
      z.object({
        article: ArticleSchema,
        canEdit: z.boolean(),
      }),
    )
    .errors({ NOT_FOUND }),

  createArticle: oc
    .route({ method: "POST", path: "/articles/{wikiId}/{slug}" })
    .input(
      z.object({
        wikiId: z.string(),
        slug: z.string(),
        title: z.string(),
        content: z.unknown(),
        signature: z.string().optional(),
      }),
    )
    .output(ArticleSchema)
    .errors({ UNAUTHORIZED, FORBIDDEN, BAD_REQUEST }),

  updateArticle: oc
    .route({ method: "PUT", path: "/articles/{wikiId}/{slug}" })
    .input(
      z.object({
        wikiId: z.string(),
        slug: z.string(),
        content: z.unknown(),
        parentRevisionId: z.string(),
        signature: z.string().optional(),
      }),
    )
    .output(ArticleSchema)
    .errors({ UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST }),

  getHistory: oc
    .route({ method: "GET", path: "/articles/{articleId}/history" })
    .input(
      z.object({
        articleId: z.string(),
        cursor: z.string().optional(),
      }),
    )
    .output(
      z.object({
        revisions: z.array(RevisionSchema),
        authors: z.record(z.string(), z.object({ name: z.string().optional() })),
        nextCursor: z.string().nullable(),
      }),
    )
    .errors({}),

  listArticles: oc
    .route({ method: "GET", path: "/wikis/{wikiId}/articles" })
    .input(
      z.object({
        wikiId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .output(
      z.object({
        data: z.array(ArticleSchema),
        meta: z.object({
          hasMore: z.boolean(),
          nextCursor: z.string().nullable(),
        }),
      }),
    )
    .errors({}),

  searchArticles: oc
    .route({ method: "GET", path: "/wikis/{wikiId}/search" })
    .input(
      z.object({
        wikiId: z.string(),
        q: z.string().min(1).max(200),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .output(
      z.object({
        data: z.array(ArticleSchema),
        meta: z.object({
          hasMore: z.boolean(),
          nextCursor: z.string().nullable(),
        }),
      }),
    )
    .errors({}),

  streamSitemapSlugs: oc
    .route({ method: "GET", path: "/sitemap/stream" })
    .input(z.object({ wikiId: z.string().optional() }))
    .output(eventIterator(SitemapEntrySchema)),
});

export type ContractType = typeof contract;
