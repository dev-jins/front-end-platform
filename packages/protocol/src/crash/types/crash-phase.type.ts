import type { z } from "zod";

import type { crashPhaseSchema } from "../schemas/crash-phase.schema";

export type CrashPhase = z.infer<typeof crashPhaseSchema>;
