import {
    businessErrorSchema,
    type ErrorLevel,
    parseErrorSchema,
    type Violation,
    validationErrorSchema,
} from "./schemas.js";

/** Error codes shared by every game family. Full table: docs/Test Game Front API.md, "Game API errors". */
export const ERROR_CODE = {
    generalError: 1,
    notEnoughMoney: 3,
    betLimitReached: 4,
    currencyNotSupported: 9,
    sessionClosed: 109,
    countryRestricted: 111,
    openedOnOtherDevice: 112,
    nickname: 140,
    languageNotSupported: 300,
} as const;

export type GameApiErrorDetail =
    | { kind: "business"; code: number; level: ErrorLevel; message: string }
    | { kind: "validation"; violations: Violation[] }
    | { kind: "parse"; message: string }
    | { kind: "not-found" }
    | { kind: "unexpected"; body: unknown };

export class GameApiError extends Error {
    constructor(
        readonly status: number,
        readonly detail: GameApiErrorDetail
    ) {
        super(detail.kind === "business" ? `${detail.code} ${detail.message}` : `Game API ${status} (${detail.kind})`);
        this.name = "GameApiError";
    }
}

/** Maps a non-2xx response to one of the API's error channels. */
export function toGameApiError(status: number, body: unknown): GameApiError {
    if (status === 404) return new GameApiError(status, { kind: "not-found" });

    const business = businessErrorSchema.safeParse(body);
    if (status === 422 && business.success) {
        const { errorCode, errorLevel, errorMessage } = business.data;
        return new GameApiError(status, {
            kind: "business",
            code: errorCode,
            level: errorLevel,
            message: errorMessage,
        });
    }

    const parse = parseErrorSchema.safeParse(body);
    if (status === 422 && parse.success) return new GameApiError(status, { kind: "parse", message: parse.data.error });

    const validation = validationErrorSchema.safeParse(body);
    if (status === 400 && validation.success) {
        return new GameApiError(status, { kind: "validation", violations: validation.data });
    }

    return new GameApiError(status, { kind: "unexpected", body });
}
