import { z } from "every-plugin/zod";
export declare const AssetSchema: z.ZodObject<{
    id: z.ZodString;
    wikiId: z.ZodString;
    url: z.ZodString;
    cid: z.ZodNullable<z.ZodString>;
    mimeType: z.ZodString;
    size: z.ZodNumber;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type Asset = z.infer<typeof AssetSchema>;
export declare const contract: {
    uploadAsset: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        wikiId: z.ZodString;
        file: z.ZodUnion<[z.ZodCustom<File, File>, z.ZodString]>;
        mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        wikiId: z.ZodString;
        url: z.ZodString;
        cid: z.ZodNullable<z.ZodString>;
        mimeType: z.ZodString;
        size: z.ZodNumber;
        createdAt: z.ZodString;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
    listAssets: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        wikiId: z.ZodString;
        cursor: z.ZodOptional<z.ZodString>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        data: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            wikiId: z.ZodString;
            url: z.ZodString;
            cid: z.ZodNullable<z.ZodString>;
            mimeType: z.ZodString;
            size: z.ZodNumber;
            createdAt: z.ZodString;
        }, z.core.$strip>>;
        meta: z.ZodObject<{
            hasMore: z.ZodBoolean;
            nextCursor: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
    deleteAsset: import("@orpc/contract").ContractProcedure<z.ZodObject<{
        assetId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        success: z.ZodLiteral<true>;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
    ping: import("@orpc/contract").ContractProcedure<import("@orpc/contract").Schema<unknown, unknown>, z.ZodObject<{
        status: z.ZodLiteral<"ok">;
        timestamp: z.ZodString;
    }, z.core.$strip>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
};
export type ContractType = typeof contract;
