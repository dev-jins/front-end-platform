import type { LaneState } from "@fep/protocol/crash";

import { toCrashFrame } from "./to-crash-frame";

const T = 1764090000000;
const lane: LaneState = {
    lane: 1,
    roundId: "r-1",
    phase: "running",
    countdownEndsAt: null,
    startAt: T,
    multiplier: "1.10",
    crashPoint: null,
    myBet: null,
    bets: [],
};
const exp = { kind: "exp", k: 0.0001 } as const;
const ticks = { kind: "ticks" } as const;

describe("toCrashFrame", () => {
    it("starting: 1x, no curve, no countdown", () => {
        expect(toCrashFrame({ ...lane, phase: "starting" }, exp, T, null)).toEqual({
            phase: "starting",
            multiplier: 1,
            elapsedMs: null,
            countdownMs: null,
        });
    });

    it("countdown: time left, never negative, null when unknown", () => {
        const countdown = { ...lane, phase: "countdown", countdownEndsAt: T + 3000 } as const;
        expect(toCrashFrame(countdown, exp, T + 1000, null).countdownMs).toBe(2000);
        expect(toCrashFrame(countdown, exp, T + 9000, null).countdownMs).toBe(0);
        expect(toCrashFrame({ ...countdown, countdownEndsAt: null }, exp, T, null).countdownMs).toBeNull();
    });

    it("running, exp: the formula from startAt", () => {
        const frame = toCrashFrame(lane, exp, T + 10000, null);
        expect(frame.elapsedMs).toBe(10000);
        expect(frame.multiplier).toBeCloseTo(Math.E, 10);
    });

    it("running, exp: never below the last tick (clock behind the server)", () => {
        expect(toCrashFrame({ ...lane, multiplier: "5.00" }, exp, T + 1000, null).multiplier).toBe(5);
    });

    it("running, exp: elapsed 0 before startAt or without one", () => {
        expect(toCrashFrame(lane, exp, T - 500, null)).toMatchObject({ elapsedMs: 0, multiplier: 1.1 });
        expect(toCrashFrame({ ...lane, startAt: null }, exp, T, null).elapsedMs).toBe(0);
    });

    it("running, ticks: the interpolated value, else the last tick", () => {
        expect(toCrashFrame(lane, ticks, T + 1000, 1.05).multiplier).toBe(1.05);
        expect(toCrashFrame(lane, ticks, T + 1000, null).multiplier).toBe(1.1);
    });

    it("crashed: the crash point, the curve stays as drawn", () => {
        expect(toCrashFrame({ ...lane, phase: "crashed", crashPoint: "2.41" }, exp, T, null)).toEqual({
            phase: "crashed",
            multiplier: 2.41,
            elapsedMs: null,
            countdownMs: null,
        });
        expect(toCrashFrame({ ...lane, phase: "crashed" }, exp, T, null).multiplier).toBe(1.1);
    });
});
