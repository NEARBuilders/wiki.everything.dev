import { Effect } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import type { z } from "every-plugin/zod";
import type { AssetSchema } from "./contract";

type Asset = z.infer<typeof AssetSchema>;

interface StoredAsset extends Asset {}

export class MediaService {
  private readonly assets = new Map<string, StoredAsset>();

  constructor(private readonly storageUrl: string) {}

  upload(wikiId: string, file: File | string, mimeType?: string): Effect.Effect<Asset> {
    return Effect.sync(() => {
      const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const resolvedMime =
        mimeType ?? (file instanceof File ? file.type : "application/octet-stream");
      const size = file instanceof File ? file.size : typeof file === "string" ? file.length : 0;

      const asset: StoredAsset = {
        id,
        wikiId,
        url: `${this.storageUrl}/${wikiId}/${id}`,
        cid: null,
        mimeType: resolvedMime,
        size,
        createdAt: new Date().toISOString(),
      };

      this.assets.set(id, asset);
      return asset;
    });
  }

  list(
    wikiId: string,
    cursor?: string,
    limit = 20,
  ): Effect.Effect<{ data: Asset[]; hasMore: boolean; nextCursor: string | null }> {
    return Effect.sync(() => {
      const all = Array.from(this.assets.values())
        .filter((a) => a.wikiId === wikiId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const startIndex = cursor ? all.findIndex((a) => a.id === cursor) + 1 : 0;
      const page = all.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < all.length;
      const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

      return { data: page, hasMore, nextCursor };
    });
  }

  delete(assetId: string): Effect.Effect<void> {
    const self = this;
    return Effect.gen(function* () {
      const exists = yield* Effect.sync(() => self.assets.has(assetId));
      if (!exists) {
        throw new ORPCError("NOT_FOUND", { message: "Asset not found" });
      }
      self.assets.delete(assetId);
    });
  }
}
