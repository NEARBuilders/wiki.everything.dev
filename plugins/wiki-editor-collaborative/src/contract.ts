import { eventIterator, oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";

export const YjsUpdateSchema = z.object({
  articleId: z.string().describe("Article identifier"),
  update: z.string().describe("Base64-encoded Yjs binary update"),
  version: z.number().int().nonnegative().optional().describe("Document version number"),
});

export type YjsUpdate = z.infer<typeof YjsUpdateSchema>;

export const DocSnapshotSchema = z.object({
  articleId: z.string(),
  version: z.number().int().nonnegative(),
  content: z.string().describe("Serialized Yjs document state"),
});

export type DocSnapshot = z.infer<typeof DocSnapshotSchema>;

export const contract = oc.router({
  subscribeArticle: oc
    .route({
      method: "GET",
      path: "/articles/{articleId}/subscribe",
      summary: "Subscribe to article updates",
      description:
        "Streams Yjs CRDT updates for a given article in real-time. Supports resume from last event ID.",
      tags: ["Collaboration"],
    })
    .input(
      z.object({
        articleId: z.string().min(1),
      }),
    )
    .output(eventIterator(YjsUpdateSchema)),

  broadcastUpdate: oc
    .route({
      method: "POST",
      path: "/articles/{articleId}/broadcast",
      summary: "Broadcast a Yjs update",
      description: "Publishes a Yjs binary update to all subscribers of the given article.",
      tags: ["Collaboration"],
    })
    .input(
      z.object({
        articleId: z.string().min(1),
        update: z.string().describe("Base64-encoded Yjs binary update"),
        version: z.number().int().nonnegative().optional(),
      }),
    )
    .output(z.object({ ok: z.boolean() })),

  getSnapshot: oc
    .route({
      method: "GET",
      path: "/articles/{articleId}/snapshot",
      summary: "Get document snapshot",
      description: "Returns the current Yjs document state for the given article.",
      tags: ["Collaboration"],
    })
    .input(
      z.object({
        articleId: z.string().min(1),
      }),
    )
    .output(DocSnapshotSchema)
    .errors({ NOT_FOUND: { status: 404, message: "Document not found" } }),

  ping: oc
    .route({
      method: "GET",
      path: "/ping",
      summary: "Health check",
      tags: ["Health"],
    })
    .output(
      z.object({
        status: z.literal("ok"),
        timestamp: z.string().datetime(),
      }),
    ),
});

export type ContractType = typeof contract;
