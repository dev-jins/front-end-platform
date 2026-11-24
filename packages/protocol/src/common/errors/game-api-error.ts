import type { GameApiErrorDetail } from "../types/game-api-error-detail.type";

export class GameApiError extends Error {
    constructor(
        readonly status: number,
        readonly detail: GameApiErrorDetail
    ) {
        super(detail.kind === "business" ? `${detail.code} ${detail.message}` : `Game API ${status} (${detail.kind})`);
        this.name = "GameApiError";
    }
}
