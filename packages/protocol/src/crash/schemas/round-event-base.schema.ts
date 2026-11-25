import { z } from "zod";

import { crashEventBaseSchema } from "./crash-event-base.schema";
import { laneIdSchema } from "./lane-id.schema";

/** Events about one lane's round. Internal, not exported. */
export const roundEventBaseSchema = crashEventBaseSchema.extend({ lane: laneIdSchema, roundId: z.string() });
