import { numericStringSchema } from "@fep/protocol";
import { z } from "zod";

/** Provider A sends amounts and multipliers as a number or a numeric string; normalized to a string. */
export const nativeAmountSchema = z.union([numericStringSchema, z.number().transform(String)]);
