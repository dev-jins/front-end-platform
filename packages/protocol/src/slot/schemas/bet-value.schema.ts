import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";

/** Bet values arrive as a number or a numeric string depending on operator settings; normalized to string. */
export const betValueSchema = z.union([numericStringSchema, z.number().transform(String)]);
