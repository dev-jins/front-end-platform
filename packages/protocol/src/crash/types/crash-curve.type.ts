import type { z } from "zod";

import type { crashCurveSchema } from "../schemas/crash-curve.schema";

export type CrashCurve = z.infer<typeof crashCurveSchema>;
