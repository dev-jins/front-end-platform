import type { z } from "zod";

import type { myBetSchema } from "../schemas/my-bet.schema";

export type MyBet = z.infer<typeof myBetSchema>;
