import { z } from "zod";

import { myStatsSchema } from "./my-stats.schema";

/** Crash part of `GET /game/{sessionKey}`. Calling it rotates the fingerprint: once per game start. */
export const nativeCrashInitSchema = z.object({
    /** Crash bodies take it as optional; sent back when init returns one. */
    fingerprint: z.string().optional(),
    server: z.object({
        /** Mercure hub URL. */
        url: z.string(),
        publicTopic: z.string(),
        playerTopic: z.string(),
        subscriberToken: z.string(),
    }),
    crashInit: myStatsSchema,
});
