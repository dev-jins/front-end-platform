import { balanceSchema } from "@fep/protocol";
import { z } from "zod";

/** `POST /crash/bet` and `POST /crash/cancelBet`. */
export const balanceResponseSchema = z.object({ balance: balanceSchema });
