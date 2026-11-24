import { z } from "zod";

/** http 400 on a missing / wrongly typed field. */
export const validationErrorSchema = z.array(
    z.object({ code: z.string().nullable(), message: z.string(), field: z.string() })
);
