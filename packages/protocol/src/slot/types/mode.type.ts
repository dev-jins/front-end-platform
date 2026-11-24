import type { z } from "zod";

import type { modeSchema } from "../schemas/mode.schema";

export type Mode = z.infer<typeof modeSchema>;
