import { z } from "zod";

import { numericStringSchema } from "./numeric-string.schema";

export const balanceSchema = z.object({
    sessionKey: z.string(),
    currency: z.string(),
    amount: numericStringSchema,
});
