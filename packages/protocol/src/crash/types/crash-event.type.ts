import type { z } from "zod";

import type { crashEventSchema } from "../schemas/crash-event.schema";

export type CrashEvent = z.infer<typeof crashEventSchema>;
