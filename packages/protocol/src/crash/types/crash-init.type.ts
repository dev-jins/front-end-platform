import type { z } from "zod";

import type { crashInitSchema } from "../schemas/crash-init.schema";

export type CrashInit = z.infer<typeof crashInitSchema>;
