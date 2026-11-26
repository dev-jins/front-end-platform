import { z } from "zod";

import { nativeAmountSchema } from "./native-amount.schema";
import { nativeIdSchema } from "./native-id.schema";

/** A Mercure `data` payload. Only `type` is guaranteed; the other fields are the ones the doc says "may" be there. */
export const nativeEventSchema = z.object({
    type: z.string(),
    roundId: nativeIdSchema.optional(),
    lane: z.int().optional(),
    multiplier: nativeAmountSchema.optional(),
});
