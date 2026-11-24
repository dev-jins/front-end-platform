import { z } from "zod";

/** Decimal amount as the API sends it. Keep it a string; never convert money to a float. */
export const numericStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/, "Expected a numeric string");
