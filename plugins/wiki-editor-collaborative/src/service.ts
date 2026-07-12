import { Effect } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import type { z } from "every-plugin/zod";
import type { DocSnapshotSchema } from "./contract";

type DocSnapshot = z.infer<typeof DocSnapshotSchema>;

interface DocState {
  version: number;
  content: string;
}

export class CollabEditorService {
  private readonly docs = new Map<string, DocState>();

  applyUpdate(articleId: string, update: string, version?: number): Effect.Effect<DocState> {
    return Effect.sync(() => {
      const existing = this.docs.get(articleId);
      const currentVersion = existing?.version ?? 0;
      const newVersion = version ?? currentVersion + 1;

      const state: DocState = {
        version: newVersion,
        content: update,
      };

      this.docs.set(articleId, state);
      return state;
    });
  }

  getSnapshot(articleId: string): Effect.Effect<DocSnapshot> {
    const self = this;
    return Effect.gen(function* () {
      const doc = yield* Effect.sync(() => self.docs.get(articleId));
      if (!doc) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }
      return {
        articleId,
        version: doc.version,
        content: doc.content,
      };
    });
  }
}
