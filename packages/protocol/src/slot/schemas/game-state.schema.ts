import { z } from "zod";
import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { fieldItemSchema } from "./field-item.schema";
import { freespinExtraSchema } from "./freespin-extra.schema";
import { modeSchema } from "./mode.schema";
import { reelSchema } from "./reel.schema";
import { stepSchema } from "./step.schema";
import { winLineSchema } from "./win-line.schema";

/**
 * Standard game state, parsed by the default adapter. Game specific state (Space Infinity, Fruit Storm, …) is NOT
 * modelled here: each game's adapter parses `lastSpin` and action responses itself.
 */
export const gameStateSchema = z.object({
    reels: z.array(reelSchema),
    bet: numericStringSchema.nullable(),
    lines: z.int().nullable(),
    totalBet: numericStringSchema.nullable(),
    totalWin: numericStringSchema,
    winLines: z.array(winLineSchema),
    mode: modeSchema,
    currentStep: stepSchema,
    nextStep: stepSchema,
    /** Empty array (not an object) outside freespin / bonus modes. */
    extra: z.union([z.tuple([]), freespinExtraSchema]),
    multiplier: z.int(),
    collectedSymbol: z.string().nullable(),
    collection: z.array(z.object({ sysname: z.string(), symbolCode: z.int() })).nullable(),
    jackpot: z.object({ win: numericStringSchema, type: z.string() }).optional(),
    wheelOfFortune: z
        .object({
            sectors: z.array(numericStringSchema),
            /** 0-based. */
            winSector: z.int(),
            win: numericStringSchema,
        })
        .optional(),
    jackpotState: z
        .object({
            field: z.object({ cols: z.int(), rows: z.int(), items: z.array(fieldItemSchema) }),
            lastOpenedItem: fieldItemSchema.nullable(),
            isCompleted: z.boolean(),
            winItemType: z.string().nullable(),
            closedItems: z.array(fieldItemSchema),
        })
        .optional(),
    typeMath: z.enum(["old", "new"]).optional(),
});
