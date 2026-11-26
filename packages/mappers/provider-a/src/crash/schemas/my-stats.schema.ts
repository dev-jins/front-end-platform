import { balanceSchema } from "@fep/protocol";
import { z } from "zod";

import { nativeAmountSchema } from "./native-amount.schema";
import { nativeIdSchema } from "./native-id.schema";
import { nativeTimeSchema } from "./native-time.schema";

/**
 * `GET /game/{sessionKey}/crash/myStats` (also `crashInit` in game init), non-lane games. Fields from
 * docs/crash-api.md; the doc has no JSON example, so undocumented shapes stay `unknown`.
 */
export const myStatsSchema = z.object({
    roundId: nativeIdSchema,
    /** Values not documented: mapped by `STATE_TO_PHASE`. */
    state: z.string(),
    multiplier: nativeAmountSchema,
    startAt: nativeTimeSchema.nullable(),
    crashPoint: nativeAmountSchema.nullable(),
    history: z.array(z.object({ roundId: nativeIdSchema, crashPoint: nativeAmountSchema, ts: z.int() })),
    myBet: z
        .object({
            amount: nativeAmountSchema,
            currency: z.string(),
            /** Not documented: read as the cash-out multiplier when numeric. */
            cashout: z.unknown(),
            win: nativeAmountSchema.nullish(),
            autoCashout: nativeAmountSchema.nullish(),
        })
        .nullable(),
    bets: z.array(
        z.object({
            id: nativeIdSchema,
            username: z.string().nullable(),
            amount: nativeAmountSchema,
            currency: z.string(),
            multiplier: nativeAmountSchema.nullable(),
            win: nativeAmountSchema.nullable(),
        })
    ),
    topWins: z.array(z.unknown()),
    myBetsList: z.array(z.unknown()),
    lastEvent: z.unknown(),
    balance: balanceSchema,
});
