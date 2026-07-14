import { createPlugin } from "every-plugin";
import { Effect, Layer } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { DatabaseLive } from "./db/layer";
import { createAuthMiddleware } from "./lib/auth";
import { ContextSchema } from "./lib/context";
import type { PluginsClient } from "./lib/plugins-types.gen";
import { ArticlesLive, ArticlesTag } from "./services/articles";
import { WikisLive, WikisTag } from "./services/wikis";

export default createPlugin.withPlugins<PluginsClient>()({
  variables: z.object({}),

  secrets: z.object({
    API_DATABASE_URL: z.string().default("pglite:.bos/api/:memory:"),
  }),

  context: ContextSchema,

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const database = DatabaseLive(config.secrets.API_DATABASE_URL);
      const wikisLayer = WikisLive.pipe(Layer.provide(database));
      const articlesLayer = ArticlesLive.pipe(Layer.provide(database));

      const wikisService = yield* Effect.provide(WikisTag, wikisLayer);
      const articlesService = yield* Effect.provide(ArticlesTag, articlesLayer);

      console.log("[API] Services Initialized");

      return {
        wikis: wikisService,
        articles: articlesService,
      };
    }),

  shutdown: () => Effect.log("[API] Shutdown"),

  createRouter: (services, builder) => {
    const { requireAuth, requireOrganization, requireOrgRole } = createAuthMiddleware(builder);

    async function verifyWikiAccess(wikiId: string, orgId: string | undefined) {
      const wiki = await services.wikis.resolveWikiById(wikiId);
      if (!wiki) {
        throw new ORPCError("NOT_FOUND", {
          message: "Wiki not found",
          data: { resource: "wiki", resourceId: wikiId },
        });
      }
      if (orgId && wiki.orgId !== orgId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Not a member of this wiki's organization",
          data: { wikiOrgId: wiki.orgId, activeOrgId: orgId },
        });
      }
      return wiki;
    }

    return {
      ping: builder.ping.handler(async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
      })),

      authHealth: builder.authHealth.use(requireAuth).handler(async () => ({
        status: "ok",
        emailConfigured: !!process.env.EMAIL_PROVIDER,
        smsConfigured: !!process.env.SMS_PROVIDER,
      })),

      createWiki: builder.createWiki
        .use(requireAuth)
        .use(requireOrganization)
        .handler(async ({ input, context }) => {
          const orgId = context.organization.activeOrganizationId;
          const subdomainSegment = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
          if (!subdomainSegment.test(input.subdomain)) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Invalid subdomain format",
              data: { hint: "Lowercase alphanumeric with hyphens or underscores only" },
            });
          }
          const accountIdRegex =
            /^(?=.{2,64}$)([a-z0-9]+(?:[-_][a-z0-9]+)*)(\.([a-z0-9]+(?:[-_][a-z0-9]+)*))*$/;
          if (!accountIdRegex.test(input.accountId)) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Invalid accountId format",
              data: { hint: "Must be a valid NEAR account ID" },
            });
          }
          if (!input.accountId.startsWith(`${input.subdomain}.`)) {
            throw new ORPCError("BAD_REQUEST", {
              message: "accountId must start with subdomain",
              data: { subdomain: input.subdomain, accountId: input.accountId },
            });
          }
          return await services.wikis.createWiki({
            subdomain: input.subdomain,
            name: input.name,
            accountId: input.accountId,
            orgId,
          });
        }),

      resolveWiki: builder.resolveWiki.handler(async ({ input, errors }) => {
        const wiki = await services.wikis.resolveWikiByAccountId(input.accountId);
        if (!wiki) {
          throw errors.NOT_FOUND({
            message: "Wiki not found",
            data: { resource: "wiki", resourceId: input.accountId },
          });
        }
        return wiki;
      }),

      deleteWiki: builder.deleteWiki
        .use(requireAuth)
        .use(requireOrgRole("owner"))
        .handler(async ({ input, context }) => {
          const wiki = await services.wikis.resolveWikiById(input.wikiId);
          if (!wiki) {
            throw new ORPCError("NOT_FOUND", {
              message: "Wiki not found",
              data: { resource: "wiki", resourceId: input.wikiId },
            });
          }
          if (wiki.orgId !== context.organization.activeOrganizationId) {
            throw new ORPCError("FORBIDDEN", {
              message: "You are not the owner of this wiki's organization",
            });
          }
          const deleted = await services.wikis.deleteWikiById(input.wikiId);
          return { deleted };
        }),

      getArticle: builder.getArticle.handler(async ({ input, errors }) => {
        const result = await services.articles.getArticle(input.wikiId, input.slug);
        if (!result) {
          throw errors.NOT_FOUND({
            message: "Article not found",
            data: { resource: "article", resourceId: `${input.wikiId}/${input.slug}` },
          });
        }
        return result;
      }),

      createArticle: builder.createArticle
        .use(requireAuth)
        .use(requireOrgRole("owner", "admin", "member"))
        .handler(async ({ input, context }) => {
          await verifyWikiAccess(input.wikiId, context.organization?.activeOrganizationId);
          return await services.articles.createArticle({
            wikiId: input.wikiId,
            slug: input.slug,
            title: input.title,
            content: input.content,
            authorId: context.userId,
            signature: input.signature,
          });
        }),

      updateArticle: builder.updateArticle
        .use(requireAuth)
        .use(requireOrgRole("owner", "admin", "member"))
        .handler(async ({ input, context }) => {
          await verifyWikiAccess(input.wikiId, context.organization?.activeOrganizationId);
          return await services.articles.updateArticle({
            wikiId: input.wikiId,
            slug: input.slug,
            content: input.content,
            parentRevisionId: input.parentRevisionId,
            authorId: context.userId,
            signature: input.signature,
          });
        }),

      getHistory: builder.getHistory.handler(async ({ input }) => {
        return await services.articles.getHistory(input.articleId, input.cursor);
      }),

      listArticles: builder.listArticles.handler(async ({ input }) => {
        const result = await services.articles.listArticles(
          input.wikiId,
          input.cursor,
          input.limit,
        );
        return {
          data: result.data,
          meta: {
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
          },
        };
      }),

      searchArticles: builder.searchArticles.handler(async ({ input }) => {
        const result = await services.articles.searchArticles(
          input.wikiId,
          input.q,
          input.cursor,
          input.limit,
        );
        return {
          data: result.data,
          meta: { hasMore: result.hasMore, nextCursor: result.nextCursor },
        };
      }),

      streamSitemapSlugs: builder.streamSitemapSlugs.handler(async function* ({ input, signal }) {
        let cursor: string | null = null;
        let hasMore = true;

        while (hasMore && !signal?.aborted) {
          const batch = await services.articles.getSitemapBatch(
            input.wikiId,
            cursor ?? undefined,
            100,
          );

          if (batch.rows.length === 0) break;

          for (const row of batch.rows) {
            if (signal?.aborted) return;
            yield {
              slug: row.slug,
              updatedAt: row.updatedAt,
              subdomain: row.subdomain,
            };
          }

          hasMore = batch.hasMore;
          cursor = batch.nextCursor;
        }
      }),
    };
  },
});
