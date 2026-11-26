import { numericStringSchema } from "@fep/protocol";
import type { CrashInit } from "@fep/protocol/crash";

/**
 * Bet within the session's limits, auto cash-out at or above the provider's minimum (and only if it has one).
 * Number() is fine here: it only compares, the strings are what gets sent.
 */
export function isAllowedBet(init: CrashInit, amount: string, autoCashout: string | undefined): boolean {
    if (!numericStringSchema.safeParse(amount).success) return false;
    const { min, max } = init.bets;
    if (Number(amount) < Number(min) || Number(amount) > Number(max)) return false;
    if (autoCashout === undefined) return true;

    const rule = init.capabilities.crash.autoCashout;
    return (
        rule !== null && numericStringSchema.safeParse(autoCashout).success && Number(autoCashout) >= Number(rule.min)
    );
}
