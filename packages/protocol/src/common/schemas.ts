import { z } from "zod";

// Shapes shared by every game family (slot, and later crash). Family specific shapes live in their own folder.

/** Decimal amount as the API sends it. Keep it a string; never convert money to a float. */
export const numericStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/, "Expected a numeric string");

export const errorLevelSchema = z.enum(["CRITICAL", "ALERT", "WARNING"]);
export type ErrorLevel = z.infer<typeof errorLevelSchema>;

export const balanceSchema = z.object({
    sessionKey: z.string(),
    currency: z.string(),
    amount: numericStringSchema,
});
export type Balance = z.infer<typeof balanceSchema>;

/** One-shot: delivered once, later responses carry null. */
export const tournamentStartPopupSchema = z.object({
    tournamentId: z.int(),
    name: z.string(),
    description: z.string(),
    rules: z.string(),
    currency: z.string(),
    totalPrizeAmount: numericStringSchema,
    endDate: z.string(),
    nowDate: z.string(),
});
export type TournamentStartPopup = z.infer<typeof tournamentStartPopupSchema>;

/** One-shot: delivered once, later responses carry null. */
export const tournamentWinnerPopupSchema = z.object({
    tournamentId: z.int(),
    name: z.string(),
    currency: z.string(),
    totalPrizeAmount: numericStringSchema,
    place: z.int(),
    prizeAmount: numericStringSchema,
});
export type TournamentWinnerPopup = z.infer<typeof tournamentWinnerPopupSchema>;

export const tournamentSchema = z.object({
    id: z.int(),
    name: z.string(),
    description: z.string(),
    rules: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    visibleUntilDate: z.string(),
    nowDate: z.string(),
    currency: z.string(),
    userCurrency: z.string(),
    rateToPoints: numericStringSchema,
    userData: z.object({
        /** "-" when the player has no place yet. */
        place: z.union([z.int(), z.literal("-")]),
        points: numericStringSchema,
    }),
    leaderboard: z.array(
        z.object({
            place: z.int(),
            username: z.string().nullable(),
            points: numericStringSchema.nullable(),
            prizeAmount: numericStringSchema.nullable(),
        })
    ),
});
export type Tournament = z.infer<typeof tournamentSchema>;

export const tournamentsResponseSchema = z.object({ tournaments: z.array(tournamentSchema) });
export type TournamentsResponse = z.infer<typeof tournamentsResponseSchema>;

// ---------------------------------------------------------------------------------------------------------------
// Error bodies
// ---------------------------------------------------------------------------------------------------------------

/** http 422 on a rejected action. */
export const businessErrorSchema = z.object({
    errorCode: z.int(),
    errorLevel: errorLevelSchema,
    errorMessage: z.string(),
});

/** http 400 on a missing / wrongly typed field. */
export const validationErrorSchema = z.array(
    z.object({ code: z.string().nullable(), message: z.string(), field: z.string() })
);
export type Violation = z.infer<typeof validationErrorSchema>[number];

/** http 422 when the request body is not valid JSON. */
export const parseErrorSchema = z.object({ error: z.string() });
