import { ZodError } from "zod";

import { parseCrashEvent } from "./parse-crash-event";

const tick = { seq: 1, serverTime: 1764090000000, lane: 1, roundId: "r-88", type: "tick", multiplier: "1.37" };

describe("parseCrashEvent", () => {
    it("parses a known event", () => {
        expect(parseCrashEvent(tick)).toEqual(tick);
    });

    it.each([{ ...tick, type: "jackpotRain" }, { seq: 1 }, null, "tick", 42])("skips %j", (raw) => {
        expect(parseCrashEvent(raw)).toBeNull();
    });

    it("throws when a known type has the wrong shape", () => {
        expect(() => parseCrashEvent({ ...tick, multiplier: 1.37 })).toThrow(ZodError);
    });
});
