import type { z } from "zod";

import type { cashoutSchema } from "../schemas/cashout.schema";

export type Cashout = z.infer<typeof cashoutSchema>;
