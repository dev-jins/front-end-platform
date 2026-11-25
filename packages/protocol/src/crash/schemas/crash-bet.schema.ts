import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";

/** Any player's bet in the live list. `multiplier` / `win` are null until that player cashes out. */
export const crashBetSchema = z.object({
    id: z.string(),
    username: z.string().nullable(),
    amount: numericStringSchema,
    currency: z.string(),
    multiplier: numericStringSchema.nullable(),
    win: numericStringSchema.nullable(),
});
