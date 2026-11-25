import type { z } from "zod";

import type { crashCommandResultSchema } from "../schemas/crash-command-result.schema";

export type CrashCommandResult = z.infer<typeof crashCommandResultSchema>;
