import type { LaneId } from "@fep/protocol/crash";

import type { CrashLaneState } from "../../store/types/crash-lane-state.type";

/**
 * A lane at the start of `roundId`. Keeps a bet already placed for that round (`betWhileRunning: "nextRound"`) and
 * the command in flight; everything else resets.
 */
export function startLaneRound(lane: LaneId, roundId: string, previous: CrashLaneState | undefined): CrashLaneState {
    return {
        lane,
        roundId,
        phase: "starting",
        countdownEndsAt: null,
        startAt: null,
        multiplier: "1.00",
        crashPoint: null,
        myBet: previous?.myBet?.roundId === roundId ? previous.myBet : null,
        bets: [],
        pending: previous?.pending ?? null,
    };
}
