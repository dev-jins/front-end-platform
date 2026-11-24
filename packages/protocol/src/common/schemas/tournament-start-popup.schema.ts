import { z } from "zod";

import { numericStringSchema } from "./numeric-string.schema";

/** One-shot: delivered once, later responses carry null. */
export const tournamentStartPopupSchema = z.object({
    tournamentId: z.int(),
    name: z.string(),
    description: z.string(),
    rules: z.string(),
    currency: z.string(),
    totalPrizeAmount: numericStringSchema,
    endDate: z.string(),
    nowDate: z.string(),
});
