import type { CrashPhase } from "@fep/protocol/crash";

/** What one lane shows in one frame. */
export interface CrashFrame {
    phase: CrashPhase;
    multiplier: number;
    /** ms since the flight started while running; null otherwise (a crashed curve stays as drawn). */
    elapsedMs: number | null;
    /** ms left in the countdown, null outside it or when unknown. */
    countdownMs: number | null;
}
