import { type ErrorLevel, GameApiError } from "@fep/protocol";

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
