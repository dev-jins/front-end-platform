import type { z } from "zod";

import type { roundResultSchema } from "../schemas/round-result.schema";

export type RoundResult = z.infer<typeof roundResultSchema>;
