import type { z } from "zod";

import type { externalFreespinsSchema } from "../schemas/external-freespins.schema";

export type ExternalFreespins = z.infer<typeof externalFreespinsSchema>;
