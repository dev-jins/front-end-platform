import { balanceSchema } from "@fep/protocol";
import { z } from "zod";

import { nativeAmountSchema } from "./native-amount.schema";

/** `POST /crash/push` (cash out). */
export const pushResponseSchema = z.object({
    multiplier: nativeAmountSchema,
    winAmount: nativeAmountSchema,
    balance: balanceSchema,
});
