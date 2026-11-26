import { clone, myStatsExample } from "../../../tests/native-examples";
import { myStatsSchema } from "./my-stats.schema";

describe("myStatsSchema", () => {
    it("normalizes numeric ids and amounts to strings", () => {
        const stats = myStatsSchema.parse(myStatsExample);
        expect(stats.roundId).toBe("88");
        expect(stats.multiplier).toBe("1.37");
        expect(stats.bets[0]?.id).toBe("501");
        expect(stats.history[0]?.roundId).toBe("87");
    });

    it("reads startAt as epoch ms or an ISO date", () => {
        const iso = myStatsSchema.parse({ ...clone(myStatsExample), startAt: "2026-11-25T16:59:55.000Z" });
        expect(iso.startAt).toBe(Date.parse("2026-11-25T16:59:55.000Z"));
        expect(myStatsSchema.safeParse({ ...clone(myStatsExample), startAt: "soon" }).success).toBe(false);
    });

    it("rejects a non-numeric amount", () => {
        expect(myStatsSchema.safeParse({ ...clone(myStatsExample), multiplier: "x1.37" }).success).toBe(false);
    });
});
