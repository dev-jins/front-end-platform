import { z } from "zod";

/**
 * `startAt`: format not documented. Accepts epoch ms or an ISO date, returns epoch ms.
 * TODO[techdebt]: pin to the real format once Provider A confirms it.
 */
export const nativeTimeSchema = z.union([
    z.int(),
    z
        .string()
        .refine((value) => !Number.isNaN(Date.parse(value)), "Expected epoch ms or an ISO date")
        .transform((value) => Date.parse(value)),
]);
