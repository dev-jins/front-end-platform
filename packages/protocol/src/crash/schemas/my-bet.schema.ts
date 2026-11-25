import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { cashoutSchema } from "./cashout.schema";
import { laneIdSchema } from "./lane-id.schema";

/** The player's own bet in the current round. `cashout` is null while the bet is still flying. */
export const myBetSchema = z.object({
    roundId: z.string(),
    lane: laneIdSchema,
    amount: numericStringSchema,
    currency: z.string(),
    autoCashout: numericStringSchema.nullable(),
    cashout: cashoutSchema.nullable(),
});
