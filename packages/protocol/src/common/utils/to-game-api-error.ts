import { GameApiError } from "../errors/game-api-error";
import { businessErrorSchema } from "../schemas/business-error.schema";
import { parseErrorSchema } from "../schemas/parse-error.schema";
import { validationErrorSchema } from "../schemas/validation-error.schema";

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
