import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { crashCurveSchema } from "./crash-curve.schema";

/** What the provider behind this session supports. The HUD and renderer adapt to it; no per-provider builds. */
export const crashCapabilitiesSchema = z.object({
    lanes: z.union([z.literal(1), z.literal(3)]),
    /** null: the provider has no auto cash-out. */
    autoCashout: z.object({ min: numericStringSchema }).nullable(),
    curve: crashCurveSchema,
    /** false: no live list of other players' bets. */
    liveBets: z.boolean(),
    betWhileRunning: z.enum(["reject", "nextRound"]),
    freeRounds: z.boolean(),
});
