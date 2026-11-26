import type { z } from "zod";

import type { myStatsSchema } from "../schemas/my-stats.schema";

export type MyStats = z.infer<typeof myStatsSchema>;
