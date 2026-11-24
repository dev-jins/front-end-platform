import type { z } from "zod";

import type { errorLevelSchema } from "../schemas/error-level.schema";

export type ErrorLevel = z.infer<typeof errorLevelSchema>;
