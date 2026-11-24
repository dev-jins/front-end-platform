import { z } from "zod";

import { numericStringSchema } from "./numeric-string.schema";

/** One-shot: delivered once, later responses carry null. */
export const tournamentWinnerPopupSchema = z.object({
    tournamentId: z.int(),
    name: z.string(),
    currency: z.string(),
    totalPrizeAmount: numericStringSchema,
    place: z.int(),
    prizeAmount: numericStringSchema,
});
