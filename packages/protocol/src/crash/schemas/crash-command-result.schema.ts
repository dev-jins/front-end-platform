import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { cashoutSchema } from "./cashout.schema";
import { myBetSchema } from "./my-bet.schema";

/** `/v1/play` response. `bet` answers `bet`, `cashout` answers `cashout`; `cancelBet` only returns the balance. */
export const crashCommandResultSchema = z.object({
    balance: numericStringSchema,
    bet: myBetSchema.optional(),
    cashout: cashoutSchema.optional(),
});
