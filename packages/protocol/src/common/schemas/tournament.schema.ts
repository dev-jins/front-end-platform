import { z } from "zod";

import { numericStringSchema } from "./numeric-string.schema";

export const tournamentSchema = z.object({
    id: z.int(),
    name: z.string(),
    description: z.string(),
    rules: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    visibleUntilDate: z.string(),
    nowDate: z.string(),
    currency: z.string(),
    userCurrency: z.string(),
    rateToPoints: numericStringSchema,
    userData: z.object({
        /** "-" when the player has no place yet. */
        place: z.union([z.int(), z.literal("-")]),
        points: numericStringSchema,
    }),
    leaderboard: z.array(
        z.object({
            place: z.int(),
            username: z.string().nullable(),
            points: numericStringSchema.nullable(),
            prizeAmount: numericStringSchema.nullable(),
        })
    ),
});
