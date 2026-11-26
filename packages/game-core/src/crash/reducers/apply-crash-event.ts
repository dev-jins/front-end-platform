import type { CrashEvent, LaneId } from "@fep/protocol/crash";

import type { CrashLaneState } from "../../store/types/crash-lane-state.type";
import type { CrashState } from "../../store/types/crash-state.type";
import { MY_BETS_LIMIT } from "../constants/my-bets-limit";
import { startLaneRound } from "../utils/start-lane-round";

type RoundEvent = Exclude<Extract<CrashEvent, { lane: LaneId }>, { type: "myBetSettled" }>;

/**
 * Folds one stream event into the state; pure. A `snapshot` replaces the round data (keeping commands in flight) and
 * resets `seq`, so a fresh connection is always accepted. Any other event at or below `lastSeq` is a repeat and is
 * ignored, as are round events for a lane the snapshot did not send.
 */
export function applyCrashEvent(state: CrashState, event: CrashEvent, receivedAt: number): CrashState {
    if (event.type !== "snapshot" && event.seq <= state.lastSeq) return state;

    // Delivery delay only makes `serverTime - receivedAt` smaller than the true offset, so the largest sample is the
    // best one. ponytail: never decreases, so a server clock stepping back is not followed; reset on a new session.
    const sample = event.serverTime - receivedAt;
    const next: CrashState = {
        ...state,
        lastSeq: event.seq,
        clockOffsetMs: state.clockOffsetMs === null ? sample : Math.max(state.clockOffsetMs, sample),
    };

    switch (event.type) {
        case "snapshot":
            return {
                ...next,
                lanes: Object.fromEntries(
                    event.lanes.map((lane) => [
                        lane.lane,
                        { ...lane, pending: state.lanes[lane.lane]?.pending ?? null },
                    ])
                ),
                history: event.history,
                topWins: event.topWins,
                myBets: event.myBets,
                balance: event.balance,
            };
        case "history":
            return { ...next, history: event.history, topWins: event.topWins };
        case "balance":
            return { ...next, balance: event.balance };
        case "myBetSettled": {
            const lane = state.lanes[event.lane];
            const bet = lane?.myBet;
            if (!lane || !bet || bet.roundId !== event.roundId) return next;
            const settled = {
                roundId: bet.roundId,
                lane: bet.lane,
                amount: bet.amount,
                currency: bet.currency,
                cashout: event.cashout,
                ts: event.serverTime,
            };
            // A lost bet leaves the lane; a cashed-out one stays to show its result until the next round.
            return {
                ...next,
                lanes: {
                    ...state.lanes,
                    [event.lane]: { ...lane, myBet: event.cashout ? { ...bet, cashout: event.cashout } : null },
                },
                myBets: [settled, ...state.myBets].slice(0, MY_BETS_LIMIT),
            };
        }
        default:
            return updateLane(next, event);
    }
}

function updateLane(state: CrashState, event: RoundEvent): CrashState {
    const current = state.lanes[event.lane];
    if (!current) return state;
    // An event for a round the lane has not seen means its roundStart was missed: start that round first.
    const lane = current.roundId === event.roundId ? current : startLaneRound(event.lane, event.roundId, current);
    const set = (patch: Partial<CrashLaneState>) => ({
        ...state,
        lanes: { ...state.lanes, [event.lane]: { ...lane, ...patch } },
    });

    switch (event.type) {
        case "roundStart":
            return set(startLaneRound(event.lane, event.roundId, current));
        case "countdown":
            return set({ phase: "countdown", countdownEndsAt: event.endsAt });
        case "running":
            return set({ phase: "running", startAt: event.startAt });
        case "tick":
            return set({ multiplier: event.multiplier });
        case "crash":
            return set({ phase: "crashed", crashPoint: event.crashPoint, multiplier: event.crashPoint });
        case "betPlaced":
            return set({ bets: [...lane.bets.filter((bet) => bet.id !== event.bet.id), event.bet] });
        case "betRemoved":
            return set({ bets: lane.bets.filter((bet) => bet.id !== event.betId) });
        case "betCashedOut":
            return set({
                bets: lane.bets.map((bet) =>
                    bet.id === event.betId
                        ? { ...bet, multiplier: event.cashout.multiplier, win: event.cashout.win }
                        : bet
                ),
            });
        case "myBetAccepted":
            return set({ myBet: event.bet });
    }
}
