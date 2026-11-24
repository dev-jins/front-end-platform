import type { z } from "zod";

import type { validationErrorSchema } from "../schemas/validation-error.schema";

export type Violation = z.infer<typeof validationErrorSchema>[number];
