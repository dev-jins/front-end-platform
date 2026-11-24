import { z } from "zod";

import { errorLevelSchema } from "./error-level.schema";

/** http 422 on a rejected action. */
export const businessErrorSchema = z.object({
    errorCode: z.int(),
    errorLevel: errorLevelSchema,
    errorMessage: z.string(),
});
