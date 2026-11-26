import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { crashCapabilitiesSchema } from "./crash-capabilities.schema";

/** Canonical init (`POST /v1/sessions`) for a crash game. Round state is not here: it comes as the stream's `snapshot`. */
export const crashInitSchema = z.object({
    /** `expiresAt` is null when the provider does not say. */
    session: z.object({ token: z.string(), expiresAt: z.string().nullable(), demo: z.boolean() }),
    game: z.object({ id: z.string(), provider: z.string(), family: z.literal("crash"), clientId: z.string() }),
    money: z.object({ balance: numericStringSchema, currency: z.string(), decimals: z.int().nonnegative() }),
    bets: z.object({ min: numericStringSchema, max: numericStringSchema, default: numericStringSchema }),
    capabilities: z.object({ crash: crashCapabilitiesSchema }),
    /** How the client reads the gateway stream. Only SSE today; the field leaves room for another kind. */
    stream: z.object({ kind: z.literal("sse"), url: z.string() }),
});
