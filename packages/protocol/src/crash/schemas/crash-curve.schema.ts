import { z } from "zod";

/** How the client draws the multiplier: a formula from `startAt` (`m = e^(k·t)`, t in ms) or server ticks only. */
export const crashCurveSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("exp"), k: z.number().positive() }),
    z.object({ kind: z.literal("ticks") }),
]);
