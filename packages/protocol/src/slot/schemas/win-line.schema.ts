import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";

export const winLineSchema = z.object({
    number: z.int(),
    symbol: z.string(),
    win: numericStringSchema,
    length: z.int(),
    direction: z.enum(["normal", "reverse"]),
});
