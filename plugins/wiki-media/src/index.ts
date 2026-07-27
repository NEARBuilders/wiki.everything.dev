import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { z } from "every-plugin/zod";

import { contract } from "./contract";
import { ContextSchema } from "./lib/context";
import { MediaService } from "./service";

export default createPlugin({
  variables: z.object({
    storageUrl: z.url().default("https://cdn.wiki.everything.dev"),
  }),

  secrets: z.object({
    storageApiKey: z.string().min(1).default("dev-key"),
  }),

  context: ContextSchema,

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new MediaService(config.variables.storageUrl);
      yield* Effect.log("[WikiMedia] Initialized");
      return { service };
    }),

  shutdown: () => Effect.log("[WikiMedia] Shutdown"),

  createRouter: (context, builder) => {
    const { service } = context;

    return {
      uploadAsset: builder.uploadAsset.handler(async ({ input }) => {
        return await Effect.runPromise(service.upload(input.wikiId, input.file, input.mimeType));
      }),

      listAssets: builder.listAssets.handler(async ({ input }) => {
        const result = await Effect.runPromise(
          service.list(input.wikiId, input.cursor, input.limit ?? 20),
        );
        return {
          data: result.data,
          meta: { hasMore: result.hasMore, nextCursor: result.nextCursor },
        };
      }),

      deleteAsset: builder.deleteAsset.handler(async ({ input }) => {
        await Effect.runPromise(service.delete(input.assetId));
        return { success: true as const };
      }),

      ping: builder.ping.handler(async () => ({
        status: "ok" as const,
        timestamp: new Date().toISOString(),
      })),
    };
  },
});
