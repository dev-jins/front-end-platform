import type { z } from "zod";

import type { laneStateSchema } from "../schemas/lane-state.schema";

export type LaneState = z.infer<typeof laneStateSchema>;
