import type { z } from "zod";

import type { stepSchema } from "../schemas/step.schema";

export type Step = z.infer<typeof stepSchema>;
