import type { z } from "zod";

import type { initResponseSchema } from "../schemas/init-response.schema";

export type InitResponse = z.infer<typeof initResponseSchema>;
