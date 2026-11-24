import { z } from "zod";

/** `number` is 1-based. */
export const reelSchema = z.object({ number: z.int(), symbols: z.array(z.string()) });
