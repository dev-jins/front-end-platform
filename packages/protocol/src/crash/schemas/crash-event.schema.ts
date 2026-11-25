import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { cashoutSchema } from "./cashout.schema";
import { crashBetSchema } from "./crash-bet.schema";
import { crashEventBaseSchema } from "./crash-event-base.schema";
import { laneStateSchema } from "./lane-state.schema";
import { myBetSchema } from "./my-bet.schema";
import { myBetRecordSchema } from "./my-bet-record.schema";
import { roundEventBaseSchema } from "./round-event-base.schema";
import { roundResultSchema } from "./round-result.schema";

/**
 * Canonical stream event (`GET /v1/stream`). The first event of every connection is `snapshot`; the rest patch it.
 * Use `parseCrashEvent` to read raw data: unknown types are skipped instead of failing.
 */
export const crashEventSchema = z.discriminatedUnion("type", [
    crashEventBaseSchema.extend({
        type: z.literal("snapshot"),
        lanes: z.array(laneStateSchema).min(1),
        history: z.array(roundResultSchema),
        topWins: z.array(crashBetSchema),
        myBets: z.array(myBetRecordSchema),
        balance: numericStringSchema,
    }),
    roundEventBaseSchema.extend({ type: z.literal("roundStart") }),
    roundEventBaseSchema.extend({ type: z.literal("countdown"), endsAt: z.int() }),
    roundEventBaseSchema.extend({ type: z.literal("running"), startAt: z.int() }),
    roundEventBaseSchema.extend({ type: z.literal("tick"), multiplier: numericStringSchema }),
    roundEventBaseSchema.extend({ type: z.literal("crash"), crashPoint: numericStringSchema }),
    crashEventBaseSchema.extend({
        type: z.literal("history"),
        history: z.array(roundResultSchema),
        topWins: z.array(crashBetSchema),
    }),
    roundEventBaseSchema.extend({ type: z.literal("betPlaced"), bet: crashBetSchema }),
    roundEventBaseSchema.extend({ type: z.literal("betRemoved"), betId: z.string() }),
    roundEventBaseSchema.extend({ type: z.literal("betCashedOut"), betId: z.string(), cashout: cashoutSchema }),
    roundEventBaseSchema.extend({ type: z.literal("myBetAccepted"), bet: myBetSchema }),
    roundEventBaseSchema.extend({
        type: z.literal("myBetSettled"),
        /** null: the bet lost. */
        cashout: cashoutSchema.nullable(),
    }),
    crashEventBaseSchema.extend({ type: z.literal("balance"), balance: numericStringSchema }),
]);
