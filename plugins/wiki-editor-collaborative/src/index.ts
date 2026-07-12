import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { MemoryPublisher } from "every-plugin/orpc";
import { z } from "every-plugin/zod";

import { contract } from "./contract";
import { ContextSchema } from "./lib/context";
import type { PluginsClient } from "./plugins-client.gen";
import { CollabEditorService } from "./service";

type CollabEvents = {
  "yjs-update": {
    articleId: string;
    update: string;
    version?: number;
  };
};

export default createPlugin.withPlugins<PluginsClient>()({
  variables: z.object({}),

  secrets: z.object({}),

  context: ContextSchema,

  contract,

  initialize: () =>
    Effect.gen(function* () {
      const publisher = new MemoryPublisher<CollabEvents>({
        resumeRetentionSeconds: 120,
      });

      yield* Effect.log("[CollabEditor] Initialized");

      return { service: new CollabEditorService(), publisher };
    }),

  shutdown: () => Effect.log("[CollabEditor] Shutdown"),

  createRouter: (context, builder) => {
    const { service, publisher } = context;

    return {
      subscribeArticle: builder.subscribeArticle.handler(async function* ({
        input,
        signal,
        lastEventId,
      }) {
        const iterator = publisher.subscribe("yjs-update", { signal, lastEventId });

        for await (const event of iterator) {
          if (event.articleId !== input.articleId) continue;
          yield event;
        }
      }),

      broadcastUpdate: builder.broadcastUpdate.handler(async ({ input }) => {
        const state = await Effect.runPromise(
          service.applyUpdate(input.articleId, input.update, input.version),
        );

        await publisher.publish("yjs-update", {
          articleId: input.articleId,
          update: input.update,
          version: state.version,
        });

        return { ok: true };
      }),

      getSnapshot: builder.getSnapshot.handler(async ({ input }) => {
        return await Effect.runPromise(service.getSnapshot(input.articleId));
      }),

      ping: builder.ping.handler(async () => ({
        status: "ok" as const,
        timestamp: new Date().toISOString(),
      })),
    };
  },
});
