import type { CrashTickEvent } from "../types/crash-tick-event.type";
import type { NativeEvent } from "../types/native-event.type";

/** Native `tick` → canonical tick. Null when it carries no multiplier, or no round id and none is known. */
export function toCrashTick(
    event: NativeEvent,
    currentRoundId: string | undefined,
    seq: number,
    serverTime: number
): CrashTickEvent | null {
    const roundId = event.roundId ?? currentRoundId;
    if (event.multiplier === undefined || roundId === undefined) return null;
    return { seq, serverTime, type: "tick", lane: 1, roundId, multiplier: event.multiplier };
}
