import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import { DatabaseTag } from "../db/layer";
import { wikis as wikisTable } from "../db/schema";

export interface WikiRecord {
  id: string;
  subdomain: string;
  accountId: string;
  orgId: string;
  name: string;
  createdAt: string;
}

export interface WikisService {
  createWiki(input: {
    subdomain: string;
    name: string;
    accountId: string;
    orgId: string;
  }): Promise<WikiRecord>;
  resolveWikiByAccountId(accountId: string): Promise<WikiRecord | null>;
  resolveWikiById(id: string): Promise<WikiRecord | null>;
  deleteWikiById(id: string): Promise<boolean>;
}

export class WikisTag extends Context.Tag("api/Wikis")<WikisService, WikisService>() {}

type WikiRow = typeof wikisTable.$inferSelect;

function toWikiRecord(row: WikiRow): WikiRecord {
  return {
    id: row.id,
    subdomain: row.subdomain,
    accountId: row.accountId,
    orgId: row.orgId,
    name: row.name,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export const WikisLive = Layer.effect(
  WikisTag,
  Effect.gen(function* () {
    const db = yield* DatabaseTag;

    const service: WikisService = {
      createWiki: async (input) => {
        try {
          const [row] = await db
            .insert(wikisTable)
            .values({
              subdomain: input.subdomain,
              name: input.name,
              accountId: input.accountId,
              orgId: input.orgId,
            })
            .onConflictDoNothing()
            .returning();

          if (!row) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Wiki with this subdomain, account ID, or org ID already exists",
              data: { invalidFields: ["subdomain", "accountId", "orgId"] },
            });
          }

          return toWikiRecord(row);
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      resolveWikiByAccountId: async (accountId) => {
        try {
          const [row] = await db
            .select()
            .from(wikisTable)
            .where(eq(wikisTable.accountId, accountId))
            .limit(1);
          return row ? toWikiRecord(row) : null;
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      resolveWikiById: async (id) => {
        try {
          const [row] = await db.select().from(wikisTable).where(eq(wikisTable.id, id)).limit(1);
          return row ? toWikiRecord(row) : null;
        } catch (error) {
          throw error instanceof ORPCError
            ? error
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              });
        }
      },

      deleteWikiById: async (id) => {
        try {
          const rows = await db
            .delete(wikisTable)
            .where(eq(wikisTable.id, id))
            .returning({ deletedId: wikisTable.id });
          return rows.length > 0;
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
