import type { z } from "zod";

import type { laneIdSchema } from "../schemas/lane-id.schema";

export type LaneId = z.infer<typeof laneIdSchema>;
