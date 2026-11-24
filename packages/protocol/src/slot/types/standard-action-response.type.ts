import type { z } from "zod";

import type { standardActionResponseSchema } from "../schemas/standard-action-response.schema";

export type StandardActionResponse = z.infer<typeof standardActionResponseSchema>;
