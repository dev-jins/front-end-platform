import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { laneIdSchema } from "./lane-id.schema";

const base = { requestId: z.uuid(), lane: laneIdSchema };

/**
 * Canonical command (`POST /v1/play`). `lane` is always sent; the connector drops it for providers without lanes.
 * `requestId` makes retries safe: the gateway answers a repeated id with the first result.
 */
export const crashCommandSchema = z.discriminatedUnion("action", [
    z.object({
        ...base,
        action: z.literal("bet"),
        bet: numericStringSchema,
        /** Target multiplier; at least `capabilities.crash.autoCashout.min`. */
        autoCashout: numericStringSchema.optional(),
    }),
    z.object({ ...base, action: z.literal("cancelBet") }),
    z.object({ ...base, action: z.literal("cashout") }),
]);
