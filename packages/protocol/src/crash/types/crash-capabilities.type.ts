import type { z } from "zod";

import type { crashCapabilitiesSchema } from "../schemas/crash-capabilities.schema";

export type CrashCapabilities = z.infer<typeof crashCapabilitiesSchema>;
