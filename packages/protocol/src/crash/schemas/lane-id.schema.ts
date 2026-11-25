import { z } from "zod";

/** 1-based lane. Games without lanes use lane 1 only. */
export const laneIdSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
