import { z } from "zod";

/** Round and bet ids: string or integer in the docs' wording; normalized to a string. */
export const nativeIdSchema = z.union([z.string(), z.int().transform(String)]);
