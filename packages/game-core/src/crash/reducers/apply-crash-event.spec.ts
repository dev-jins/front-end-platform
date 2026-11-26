import type { CrashBet, CrashEvent, LaneState, MyBet } from "@fep/protocol/crash";

import { initialCrashState } from "../../store/constants/initial-crash-state";
import { createCrashStore } from "../../store/create-crash-store";
import type { CrashState } from "../../store/types/crash-state.type";
import { MY_BETS_LIMIT } from "../constants/my-bets-limit";
import { applyCrashEvent } from "./apply-crash-event";

const T = 1764090000000;
const bet: CrashBet = { id: "b-1", username: "p1", amount: "5.00", currency: "USD", multiplier: null, win: null };
const myBet: MyBet = { roundId: "r-1", lane: 1, amount: "1.00", currency: "USD", autoCashout: null, cashout: null };
const lane: LaneState = {
    lane: 1,
    roundId: "r-1",
    phase: "running",
    countdownEndsAt: null,
    startAt: T - 5000,
    multiplier: "1.37",
    crashPoint: null,
    myBet,
    bets: [bet],
};
const snapshot: CrashEvent = {
    seq: 10,
    serverTime: T,
    type: "snapshot",
    lanes: [lane],
    history: [{ roundId: "r-0", crashPoint: "2.00", ts: T - 20000 }],
    topWins: [],
    myBets: [],
    balance: "100.00",
};

let seq = 10;
/** Next round event for lane 1, round r-1 unless overridden. */
const round = (event: Record<string, unknown>) =>
    ({ seq: ++seq, serverTime: T + seq, lane: 1, roundId: "r-1", ...event }) as CrashEvent;

/** Applies events in order, each received exactly at its serverTime. */
const apply = (state: CrashState, ...events: CrashEvent[]) =>
    events.reduce((s, e) => applyCrashEvent(s, e, e.serverTime), state);

const live = () => apply(initialCrashState, snapshot);

beforeEach(() => {
    seq = 10;
});

describe("createCrashStore", () => {
    it("starts from the initial state", () => {
        expect(createCrashStore().getState()).toBe(initialCrashState);
    });
});

describe("applyCrashEvent", () => {
    it("snapshot: replaces round data, keyed by lane", () => {
        const state = live();
        expect(state.lanes[1]).toEqual({ ...lane, pending: null });
        expect(state).toMatchObject({ balance: "100.00", lastSeq: 10, history: snapshot.history });
    });

    it("snapshot: keeps a command in flight and resets seq for a new connection", () => {
        const state = { ...live(), lastSeq: 500 };
        state.lanes = { 1: { ...lane, pending: "cashout" } };
        const next = apply(state, { ...snapshot, seq: 1 });
        expect(next.lanes[1]?.pending).toBe("cashout");
        expect(next.lastSeq).toBe(1);
    });

    it("ignores repeats at or below lastSeq", () => {
        const state = live();
        expect(applyCrashEvent(state, round({ type: "tick", multiplier: "9.99", seq: 10 }), T)).toBe(state);
    });

    it("plays a round: start → countdown → running → tick → crash", () => {
        const state = apply(
            live(),
            round({ type: "roundStart", roundId: "r-2" }),
            round({ type: "countdown", roundId: "r-2", endsAt: T + 5000 }),
            round({ type: "running", roundId: "r-2", startAt: T + 5000 }),
            round({ type: "tick", roundId: "r-2", multiplier: "1.10" })
        );
        expect(state.lanes[1]).toMatchObject({
            roundId: "r-2",
            phase: "running",
            countdownEndsAt: T + 5000,
            startAt: T + 5000,
            multiplier: "1.10",
            myBet: null,
            bets: [],
        });

        const crashed = apply(state, round({ type: "crash", roundId: "r-2", crashPoint: "1.20" }));
        expect(crashed.lanes[1]).toMatchObject({ phase: "crashed", crashPoint: "1.20", multiplier: "1.20" });
    });

    it("roundStart keeps a bet placed for that round", () => {
        const nextRoundBet = { ...myBet, roundId: "r-2" };
        const state = live();
        state.lanes = { 1: { ...lane, myBet: nextRoundBet, pending: null } };
        expect(apply(state, round({ type: "roundStart", roundId: "r-2" })).lanes[1]?.myBet).toBe(nextRoundBet);
    });

    it("starts the round itself when its roundStart was missed", () => {
        const state = apply(live(), round({ type: "countdown", roundId: "r-3", endsAt: T + 1 }));
        expect(state.lanes[1]).toMatchObject({ roundId: "r-3", phase: "countdown", bets: [], myBet: null });
    });

    it("ignores round events for a lane the snapshot did not send, but counts their seq", () => {
        const state = apply(live(), round({ type: "tick", lane: 2, multiplier: "1.50" }));
        expect(state.lanes[2]).toBeUndefined();
        expect(state.lastSeq).toBe(11);
    });

    it("live bets: place (upsert), cash out, remove", () => {
        const other = { ...bet, id: "b-2" };
        const state = apply(
            live(),
            round({ type: "betPlaced", bet: other }),
            round({ type: "betPlaced", bet: { ...other, amount: "7.00" } }),
            round({ type: "betCashedOut", betId: "b-2", cashout: { multiplier: "1.50", win: "10.50" } })
        );
        expect(state.lanes[1]?.bets).toEqual([bet, { ...other, amount: "7.00", multiplier: "1.50", win: "10.50" }]);
        expect(apply(state, round({ type: "betRemoved", betId: "b-1" })).lanes[1]?.bets.map((b) => b.id)).toEqual([
            "b-2",
        ]);
    });

    it("own bet: accepted, then cashed out — stays on the lane and goes to myBets", () => {
        const state = apply(
            live(),
            round({ type: "myBetAccepted", bet: { ...myBet, autoCashout: "2.00" } }),
            round({ type: "myBetSettled", cashout: { multiplier: "2.00", win: "2.00" } })
        );
        expect(state.lanes[1]?.myBet?.cashout).toEqual({ multiplier: "2.00", win: "2.00" });
        expect(state.myBets[0]).toEqual({
            roundId: "r-1",
            lane: 1,
            amount: "1.00",
            currency: "USD",
            cashout: { multiplier: "2.00", win: "2.00" },
            ts: T + 12,
        });
    });

    it("own bet lost: leaves the lane; myBets keeps the newest MY_BETS_LIMIT", () => {
        const state = {
            ...live(),
            myBets: Array.from({ length: MY_BETS_LIMIT }, (_, i) => ({ ...myBet, roundId: `old-${i}`, ts: i })),
        };
        const next = apply(state, round({ type: "myBetSettled", cashout: null }));
        expect(next.lanes[1]?.myBet).toBeNull();
        expect(next.myBets).toHaveLength(MY_BETS_LIMIT);
        expect(next.myBets[0]).toMatchObject({ roundId: "r-1", cashout: null });
    });

    it("myBetSettled for another round or a missing bet only advances seq", () => {
        const state = live();
        const other = apply(state, round({ type: "myBetSettled", roundId: "r-0", cashout: null }));
        expect(other.lanes).toBe(state.lanes);
        expect(other.lastSeq).toBe(11);
        expect(apply(initialCrashState, round({ type: "myBetSettled", cashout: null })).myBets).toEqual([]);
    });

    it("history and balance events", () => {
        const history = [{ roundId: "r-1", crashPoint: "1.20", ts: T }];
        const state = apply(
            live(),
            { seq: 11, serverTime: T, type: "history", history, topWins: [bet] },
            { seq: 12, serverTime: T, type: "balance", balance: "95.00" }
        );
        expect(state).toMatchObject({ history, topWins: [bet], balance: "95.00" });
    });

    it("clock offset: the largest serverTime − receivedAt seen", () => {
        let state = applyCrashEvent(initialCrashState, snapshot, T + 300);
        expect(state.clockOffsetMs).toBe(-300);
        state = applyCrashEvent(state, round({ type: "tick", multiplier: "1.40", serverTime: T + 1000 }), T + 1100);
        expect(state.clockOffsetMs).toBe(-100);
        state = applyCrashEvent(state, round({ type: "tick", multiplier: "1.50", serverTime: T + 2000 }), T + 2900);
        expect(state.clockOffsetMs).toBe(-100);
    });
});
