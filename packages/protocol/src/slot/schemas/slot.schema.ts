import { z } from "zod";
import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { bigwinStepsSchema } from "./bigwin-steps.schema";

export const slotSchema = z.object({
    id: z.int(),
    name: z.string(),
    systemName: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    params: z.object({
        enableSecondBet: z.boolean(),
        info: z.object({
            rtp: numericStringSchema,
            maxWinMultiplier: z.int(),
            /** Tiers object, `[]` for games without a jackpot, null when the game has no math on this server. */
            jackpot: z.union([z.tuple([]), z.record(z.string(), z.unknown())]).nullable(),
        }),
        reelsSizes: z.array(z.int()).nullable(),
        reelsCount: z.int().nullable(),
        linesCount: z.int().nullable(),
        symbolsCount: z.int().nullable(),
        /** `positions` are 1-based rows, one per reel. */
        lines: z.array(z.object({ number: z.int(), positions: z.array(z.int()) })).nullable(),
        symbols: z
            .array(
                z.object({
                    isJackpot: z.boolean(),
                    isScatter: z.boolean(),
                    isWild: z.boolean(),
                    name: z.string(),
                    /** Index 0 = one matched symbol. */
                    wins: z.array(z.number()),
                })
            )
            .nullable(),
        bigwin: z.object({ winCoefs: bigwinStepsSchema, valuesForStart: bigwinStepsSchema }).nullable(),
    }),
});
