import { toCrashTick } from "./to-crash-tick";

describe("toCrashTick", () => {
    it("uses the event's round id, else the current one", () => {
        expect(toCrashTick({ type: "tick", roundId: "9", multiplier: "1.10" }, "8", 3, 100)).toEqual({
            seq: 3,
            serverTime: 100,
            type: "tick",
            lane: 1,
            roundId: "9",
            multiplier: "1.10",
        });
        expect(toCrashTick({ type: "tick", multiplier: "1.10" }, "8", 3, 100)?.roundId).toBe("8");
    });

    it("returns null without a multiplier or any round id", () => {
        expect(toCrashTick({ type: "tick", roundId: "9" }, "8", 1, 0)).toBeNull();
        expect(toCrashTick({ type: "tick", multiplier: "1.10" }, undefined, 1, 0)).toBeNull();
    });
});
