import { oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";

export const AssetSchema = z.object({
  id: z.string().describe("Unique asset identifier"),
  wikiId: z.string().describe("Wiki this asset belongs to"),
  url: z.string().url().describe("Public URL of the asset"),
  cid: z.string().nullable().describe("IPFS content ID if stored on IPFS"),
  mimeType: z.string().describe("MIME type of the asset"),
  size: z.number().int().nonnegative().describe("Asset size in bytes"),
  createdAt: z.string().datetime().describe("ISO 8601 upload timestamp"),
});

export type Asset = z.infer<typeof AssetSchema>;

export const contract = oc.router({
  uploadAsset: oc
    .route({
      method: "POST",
      path: "/assets/upload",
      summary: "Upload a media asset",
      description: "Uploads a file for a given wiki. Returns the stored asset metadata.",
      tags: ["Assets"],
    })
    .input(
      z.object({
        wikiId: z.string().min(1),
        file: z.instanceof(File).or(z.string()).describe("File object or base64 string"),
        mimeType: z.string().optional(),
      }),
    )
    .output(AssetSchema),

  listAssets: oc
    .route({
      method: "GET",
      path: "/assets/{wikiId}",
      summary: "List media assets",
      description: "Returns a paginated list of assets for the given wiki.",
      tags: ["Assets"],
    })
    .input(
      z.object({
        wikiId: z.string().min(1),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .output(
      z.object({
        data: z.array(AssetSchema),
        meta: z.object({
          hasMore: z.boolean(),
          nextCursor: z.string().nullable(),
        }),
      }),
    ),

  deleteAsset: oc
    .route({
      method: "DELETE",
      path: "/assets/{assetId}",
      summary: "Delete a media asset",
      description: "Removes an asset by its ID.",
      tags: ["Assets"],
    })
    .input(
      z.object({
        assetId: z.string().min(1),
      }),
    )
    .output(z.object({ success: z.literal(true) })),

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
