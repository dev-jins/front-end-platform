import type { z } from "zod";

import type { myBetRecordSchema } from "../schemas/my-bet-record.schema";

export type MyBetRecord = z.infer<typeof myBetRecordSchema>;
