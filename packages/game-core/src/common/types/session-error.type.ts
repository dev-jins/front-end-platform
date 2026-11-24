import type { ErrorLevel } from "@fep/protocol";

/**
 * What the UI shows, by level:
 * CRITICAL → session-over screen · ALERT → dialog, player can retry · WARNING → logged only.
 */
export interface SessionError {
    /** API error code, null when the failure did not come from the API (network, invalid response). */
    code: number | null;
    level: ErrorLevel;
    message: string;
}
