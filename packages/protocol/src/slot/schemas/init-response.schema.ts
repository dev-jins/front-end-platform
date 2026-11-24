import { z } from "zod";

import { balanceSchema } from "../../common/schemas/balance.schema";
import { errorLevelSchema } from "../../common/schemas/error-level.schema";
import { numericStringSchema } from "../../common/schemas/numeric-string.schema";
import { tournamentSchema } from "../../common/schemas/tournament.schema";
import { tournamentStartPopupSchema } from "../../common/schemas/tournament-start-popup.schema";
import { tournamentWinnerPopupSchema } from "../../common/schemas/tournament-winner-popup.schema";
import { betValueSchema } from "./bet-value.schema";
import { externalFreespinsSchema } from "./external-freespins.schema";
import { modeSchema } from "./mode.schema";
import { slotSchema } from "./slot.schema";

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
