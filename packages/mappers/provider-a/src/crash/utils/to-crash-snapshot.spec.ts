import { crashEventSchema } from "@fep/protocol/crash";

import { clone, myStatsExample } from "../../../tests/native-examples";
import { myStatsSchema } from "../schemas/my-stats.schema";
import { toCrashSnapshot } from "./to-crash-snapshot";

const statsWith = (patch: Record<string, unknown>) => myStatsSchema.parse({ ...clone(myStatsExample), ...patch });

describe("toCrashSnapshot", () => {
    it("builds a valid canonical snapshot for lane 1", () => {
        const snapshot = toCrashSnapshot(statsWith({}), 1, 1764090000000);
        expect(crashEventSchema.parse(snapshot)).toEqual(snapshot);
        expect(snapshot.lanes[0]).toMatchObject({
            lane: 1,
            roundId: "88",
            phase: "running",
            startAt: 1764089995000,
            countdownEndsAt: null,
            myBet: { roundId: "88", lane: 1, amount: "1.00", autoCashout: "2.00", cashout: null },
        });
        expect(snapshot.balance).toBe("102.00");
    });

    it("reads startAt as the countdown end before the flight", () => {
        const lane = toCrashSnapshot(statsWith({ state: "countDown" }), 1, 0).lanes[0];
        expect(lane).toMatchObject({ phase: "countdown", countdownEndsAt: 1764089995000, startAt: null });
    });

    it("reads a numeric cashout as the cash-out multiplier", () => {
        const myBet = { amount: "1.00", currency: "USD", cashout: 1.84, win: "1.84", autoCashout: null };
        const lane = toCrashSnapshot(statsWith({ myBet }), 1, 0).lanes[0];
        expect(lane?.myBet?.cashout).toEqual({ multiplier: "1.84", win: "1.84" });
        expect(lane?.myBet?.autoCashout).toBeNull();
    });

    it("keeps a missing bet as null", () => {
        expect(toCrashSnapshot(statsWith({ myBet: null }), 1, 0).lanes[0]?.myBet).toBeNull();
    });

    it("throws on an unknown state", () => {
        expect(() => toCrashSnapshot(statsWith({ state: "paused" }), 1, 0)).toThrow('unknown crash state "paused"');
    });
});
