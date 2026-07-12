import { z } from "every-plugin/zod";
export declare const YjsUpdateSchema: z.ZodObject<{
    articleId: z.ZodString;
    update: z.ZodString;
    version: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type YjsUpdate = z.infer<typeof YjsUpdateSchema>;
export declare const DocSnapshotSchema: z.ZodObject<{
    articleId: z.ZodString;
    version: z.ZodNumber;
    content: z.ZodString;
}, z.core.$strip>;
export type DocSnapshot = z.infer<typeof DocSnapshotSchema>;
export declare const contract: {
    subscribeArticle: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        articleId: z.ZodString;
    }, z.core.$strip>, import("@orpc/contract").Schema<AsyncIteratorObject<{
        articleId: string;
        update: string;
        version?: number | undefined;
    }, unknown, void>, import("@orpc/shared").AsyncIteratorClass<{
        articleId: string;
        update: string;
        version?: number | undefined;
    }, unknown, void>>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
    broadcastUpdate: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        articleId: z.ZodString;
        update: z.ZodString;
        version: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        ok: z.ZodBoolean;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
    getSnapshot: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        articleId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        articleId: z.ZodString;
        version: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, import("@orpc/contract").MergedErrorMap<Record<never, never>, {
        NOT_FOUND: {
            status: number;
            message: string;
        };
    }>>, Record<never, never>>;
    ping: import("@orpc/contract").ContractProcedure<import("@orpc/contract").Schema<unknown, unknown>, z.ZodObject<{
        status: z.ZodLiteral<"ok">;
        timestamp: z.ZodString;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
};
export type ContractType = typeof contract;
