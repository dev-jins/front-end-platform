import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { crashBetSchema } from "./crash-bet.schema";
import { crashPhaseSchema } from "./crash-phase.schema";
import { laneIdSchema } from "./lane-id.schema";
import { myBetSchema } from "./my-bet.schema";

/** One lane's round as the snapshot sends it. Times are server epoch ms. */
export const laneStateSchema = z.object({
    lane: laneIdSchema,
    roundId: z.string(),
    phase: crashPhaseSchema,
    /** Set while the phase is countdown. */
    countdownEndsAt: z.int().nullable(),
    /** Set once the phase is running. */
    startAt: z.int().nullable(),
    /** Last server multiplier. */
    multiplier: numericStringSchema,
    /** null until the round crashes. */
    crashPoint: numericStringSchema.nullable(),
    myBet: myBetSchema.nullable(),
    bets: z.array(crashBetSchema),
});
