import type { z } from "zod";

import type { crashBetSchema } from "../schemas/crash-bet.schema";

export type CrashBet = z.infer<typeof crashBetSchema>;
