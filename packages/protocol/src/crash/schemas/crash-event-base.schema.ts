import { z } from "zod";

/** Every stream event: per-room order and server clock, both added by the gateway. Internal, not exported. */
export const crashEventBaseSchema = z.object({
    seq: z.int().nonnegative(),
    /** Epoch ms. */
    serverTime: z.int(),
});
