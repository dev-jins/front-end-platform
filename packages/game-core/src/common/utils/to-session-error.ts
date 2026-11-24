import { GameApiError } from "@fep/protocol";

import type { SessionError } from "../types/session-error.type";

/**
 * Anything that is not a documented business error is CRITICAL: after a network failure or an unreadable response
 * the client cannot know whether the round was played, and re-sending an action could play it twice.
 * Reloading recovers safely (init restores `lastSpin`).
 */
export function toSessionError(error: unknown): SessionError {
    if (error instanceof GameApiError && error.detail.kind === "business") {
        const { code, level, message } = error.detail;
        return { code, level, message };
    }
    return { code: null, level: "CRITICAL", message: error instanceof Error ? error.message : String(error) };
}
