import type { z } from "zod";

import type { crashCommandSchema } from "../schemas/crash-command.schema";

export type CrashCommand = z.infer<typeof crashCommandSchema>;
