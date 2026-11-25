import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { cashoutSchema } from "./cashout.schema";
import { laneIdSchema } from "./lane-id.schema";

/** A settled bet in the player's recent bets. `cashout` null means lost. */
export const myBetRecordSchema = z.object({
    roundId: z.string(),
    lane: laneIdSchema,
    amount: numericStringSchema,
    currency: z.string(),
    cashout: cashoutSchema.nullable(),
    /** Epoch ms. */
    ts: z.int(),
});
