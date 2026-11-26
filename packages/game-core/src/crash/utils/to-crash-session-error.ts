import type { SessionError } from "../../common/types/session-error.type";
import { toSessionError } from "../../common/utils/to-session-error";

/**
 * Shared policy, except failures without an API code (network, unreadable response) are ALERT, not CRITICAL: unlike a
 * slot spin, a crash command carries a `requestId` (a retry can't play twice) and the stream reports what really
 * happened to the bet, so the session can go on.
 */
export function toCrashSessionError(error: unknown): SessionError {
    const sessionError = toSessionError(error);
    return sessionError.code === null ? { ...sessionError, level: "ALERT" } : sessionError;
}
