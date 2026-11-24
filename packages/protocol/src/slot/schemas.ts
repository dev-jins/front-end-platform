import { z } from "zod";

import {
    balanceSchema,
    errorLevelSchema,
    numericStringSchema,
    tournamentSchema,
    tournamentStartPopupSchema,
    tournamentWinnerPopupSchema,
} from "../common/schemas.js";

// Slot game schemas for the Game Front API (docs/Test Game Front API.md).
// Game specific state (Space Infinity, Fruit Storm, …) is NOT modelled here: each game's adapter parses
// `lastSpin` and action responses itself. `gameStateSchema` is the standard shape for the default adapter.

/** Bet values arrive as a number or a numeric string depending on operator settings; normalized to string. */
const betValueSchema = z.union([numericStringSchema, z.number().transform(String)]);

export const stepSchema = z.enum([
    "spin",
    "freespin",
    "buy",
    "respin",
    "avalanche",
    "bonus",
    "getPreviousState",
    "jackpot",
]);
export type Step = z.infer<typeof stepSchema>;

export const modeSchema = z.enum(["spin", "freespin"]);
export type Mode = z.infer<typeof modeSchema>;

export const externalFreespinsSchema = z.object({
    total: z.int(),
    current: z.int(),
    bet: numericStringSchema,
    totalWin: numericStringSchema,
    isLast: z.boolean(),
    /** When not null the current session is closed: call game init with this key. */
    nextSessionKey: z.string().nullable(),
});
export type ExternalFreespins = z.infer<typeof externalFreespinsSchema>;

// ---------------------------------------------------------------------------------------------------------------
// Standard game state
// ---------------------------------------------------------------------------------------------------------------

/** `number` is 1-based. */
export const reelSchema = z.object({ number: z.int(), symbols: z.array(z.string()) });

export const winLineSchema = z.object({
    number: z.int(),
    symbol: z.string(),
    win: numericStringSchema,
    length: z.int(),
    direction: z.enum(["normal", "reverse"]),
});
export type WinLine = z.infer<typeof winLineSchema>;

export const freespinExtraSchema = z.object({
    bet: numericStringSchema.nullable(),
    currentFreespins: z.int(),
    freespins: z.int(),
    totalFreespins: z.int(),
    symbol: z.string().nullable(),
    symbols: z.array(z.string()),
    bonusWin: numericStringSchema,
    bonusWins: z.array(numericStringSchema),
    totalWin: numericStringSchema,
    /** 0-based reel indexes. */
    reelsWithSpecials: z.array(z.int()),
    variant: z.int().nullable(),
    multiplier: z.int(),
    bonusLineLength: z.int().optional(),
    bonusLineNumber: z.int().optional(),
    startBonus: z.boolean().optional(),
});
export type FreespinExtra = z.infer<typeof freespinExtraSchema>;

const fieldItemSchema = z.object({ col: z.int(), row: z.int(), item: z.string() });

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
export type GameState = z.infer<typeof gameStateSchema>;

/** Fields every action response adds next to the (game specific) state at its root. */
export const actionWrapperSchema = z.object({
    balance: balanceSchema,
    externalFreespins: externalFreespinsSchema.nullish(),
    tournamentStartPopup: tournamentStartPopupSchema.nullish(),
    tournamentWinnerPopup: tournamentWinnerPopupSchema.nullish(),
});
export type ActionWrapper = z.infer<typeof actionWrapperSchema>;

/** Action response of a standard game: state + wrapper at the root. */
export const standardActionResponseSchema = gameStateSchema.extend(actionWrapperSchema.shape);
export type StandardActionResponse = z.infer<typeof standardActionResponseSchema>;

// ---------------------------------------------------------------------------------------------------------------
// Game init
// ---------------------------------------------------------------------------------------------------------------

const bigwinStepsSchema = z.object({
    firstStep: z.number(),
    secondStep: z.number(),
    thirdStep: z.number(),
    fourthStep: z.number(),
    fifthStep: z.number(),
});

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
export type Slot = z.infer<typeof slotSchema>;

export const initResponseSchema = z.object({
    /** null for a demo session. */
    user: z.object({ uid: z.string(), username: z.string().nullable() }).nullable(),
    fingerprint: z.string(),
    sessionKey: z.string(),
    locale: z.string(),
    translationsUrl: z.string(),
    fallbackTranslationsUrl: z.string(),
    bets: z.array(betValueSchema),
    /** Buy price multiplier in percent of total bet. */
    bonusCoefficient: z.int(),
    lines: z.int().nullable(),
    mode: modeSchema,
    /** Game state to restore; shape differs per game, parsed by the game adapter. */
    lastSpin: z.unknown(),
    slot: slotSchema,
    homeUrl: z.string().nullable(),
    balance: balanceSchema,
    currency: z.string(),
    currencyMultiplier: z.int(),
    clientSettings: z.object({ superFastSpins: z.boolean() }).nullable(),
    externalFreespins: externalFreespinsSchema.nullable(),
    socials: z.union([z.object({ nickname: z.string() }), z.object({ needToRequestNickname: z.boolean() })]),
    operatorData: z.object({
        hasLobby: z.boolean(),
        clientSettings: z.record(z.string(), z.unknown()).nullable(),
        showHomeButton: z.boolean(),
        hasSlowMode: z.boolean(),
        hasCollections: z.boolean(),
    }),
    currencyData: z.object({
        currency: z.string(),
        multiplier: z.int(),
        /** Decimals to display. */
        rounding: z.int(),
        iconUrl: z.string(),
        iconBorderUrl: z.string(),
    }),
    jackpotParameters: z.record(z.string(), numericStringSchema).optional(),
    /** Key is the `variant` to send to /bonus. */
    bonusParameters: z
        .record(z.string(), z.object({ symbol: z.string(), freespins: z.int(), multiplier: z.int() }))
        .optional(),
    server: z
        .object({
            http: z.object({ domain: z.string(), port: z.string() }),
            socket: z.object({ domain: z.string(), port: z.string() }),
        })
        .optional(),
    /** Absent when init reports an error. */
    tournaments: z.array(tournamentSchema).optional(),
    tournamentStartPopup: tournamentStartPopupSchema.nullish(),
    tournamentWinnerPopup: tournamentWinnerPopupSchema.nullish(),
    /** Init reports some errors (109, 111, 300) inside its http 200 payload. */
    errorCode: z.int().optional(),
    errorLevel: errorLevelSchema.optional(),
    errorMessage: z.string().optional(),
});
export type InitResponse = z.infer<typeof initResponseSchema>;
