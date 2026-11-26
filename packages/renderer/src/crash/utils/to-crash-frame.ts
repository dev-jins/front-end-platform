import type { CrashCurve, LaneState } from "@fep/protocol/crash";

import type { CrashFrame } from "../types/crash-frame.type";
import { multiplierAt } from "./multiplier-at";

/**
 * One lane's frame from store data and the server clock (`Date.now() + clockOffsetMs`).
 * - running, `exp` curve: the formula from `startAt`, never below the last tick (corrects a wrong clock offset);
 * - running, ticks only: `interpolated` (one tick behind), else the last tick;
 * - crashed: the crash point.
 */
export function toCrashFrame(
    lane: LaneState,
    curve: CrashCurve,
    serverNow: number,
    interpolated: number | null
): CrashFrame {
    const tick = Number(lane.multiplier);
    switch (lane.phase) {
        case "starting":
            return { phase: lane.phase, multiplier: 1, elapsedMs: null, countdownMs: null };
        case "countdown":
            return {
                phase: lane.phase,
                multiplier: 1,
                elapsedMs: null,
                countdownMs: lane.countdownEndsAt === null ? null : Math.max(0, lane.countdownEndsAt - serverNow),
            };
        case "running": {
            const elapsedMs = lane.startAt === null ? 0 : Math.max(0, serverNow - lane.startAt);
            const multiplier =
                curve.kind === "exp" ? Math.max(multiplierAt(curve.k, elapsedMs), tick) : (interpolated ?? tick);
            return { phase: lane.phase, multiplier, elapsedMs, countdownMs: null };
        }
        case "crashed":
            return {
                phase: lane.phase,
                multiplier: Number(lane.crashPoint ?? lane.multiplier),
                elapsedMs: null,
                countdownMs: null,
            };
    }
}
