import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";

export const externalFreespinsSchema = z.object({
    total: z.int(),
    current: z.int(),
    bet: numericStringSchema,
    totalWin: numericStringSchema,
    isLast: z.boolean(),
    /** When not null the current session is closed: call game init with this key. */
    nextSessionKey: z.string().nullable(),
});
