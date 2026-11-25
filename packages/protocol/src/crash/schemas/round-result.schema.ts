import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";

export const roundResultSchema = z.object({
    roundId: z.string(),
    crashPoint: numericStringSchema,
    /** Epoch ms. */
    ts: z.int(),
});
