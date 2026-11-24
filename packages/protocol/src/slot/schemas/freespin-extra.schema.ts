import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";

export const freespinExtraSchema = z.object({
    bet: numericStringSchema.nullable(),
    currentFreespins: z.int(),
    freespins: z.int(),
    totalFreespins: z.int(),
    symbol: z.string().nullable(),
    symbols: z.array(z.string()),
    bonusWin: numericStringSchema,
    bonusWins: z.array(numericStringSchema),
    totalWin: numericStringSchema,
    /** 0-based reel indexes. */
    reelsWithSpecials: z.array(z.int()),
    variant: z.int().nullable(),
    multiplier: z.int(),
    bonusLineLength: z.int().optional(),
    bonusLineNumber: z.int().optional(),
    startBonus: z.boolean().optional(),
});
