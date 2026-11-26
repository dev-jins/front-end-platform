import type { z } from "zod";

import type { nativeCrashInitSchema } from "../schemas/native-crash-init.schema";

export type NativeCrashInit = z.infer<typeof nativeCrashInitSchema>;
