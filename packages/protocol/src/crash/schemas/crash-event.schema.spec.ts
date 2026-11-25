import { crashEventSchema } from "./crash-event.schema";

const at = { seq: 1000, serverTime: 1764090000000 };
const round = { ...at, lane: 1, roundId: "r-88" };
const bet = { id: "b-1", username: null, amount: "1.00", currency: "USD", multiplier: null, win: null };

describe("crashEventSchema", () => {
    it("parses a snapshot", () => {
        const event = crashEventSchema.parse({
            ...at,
            type: "snapshot",
            lanes: [
                {
                    lane: 1,
                    roundId: "r-88",
                    phase: "running",
                    countdownEndsAt: null,
                    startAt: 1764089995000,
                    multiplier: "1.37",
                    crashPoint: null,
                    myBet: {
                        roundId: "r-88",
                        lane: 1,
                        amount: "1.00",
                        currency: "USD",
                        autoCashout: "2.00",
                        cashout: null,
                    },
                    bets: [bet],
                },
            ],
            history: [{ roundId: "r-87", crashPoint: "3.10", ts: 1764089990000 }],
            topWins: [],
            myBets: [{ roundId: "r-87", lane: 1, amount: "1.00", currency: "USD", cashout: null, ts: 1764089990000 }],
            balance: "102.00",
        });
        expect(event.type === "snapshot" && event.lanes[0]?.phase).toBe("running");
    });

    it.each([
        { ...round, type: "roundStart" },
        { ...round, type: "countdown", endsAt: 1764090005000 },
        { ...round, type: "running", startAt: 1764090005000 },
        { ...round, type: "tick", multiplier: "1.37" },
        { ...round, type: "crash", crashPoint: "2.41" },
        { ...at, type: "history", history: [], topWins: [bet] },
        { ...round, type: "betPlaced", bet },
        { ...round, type: "betRemoved", betId: "b-1" },
        { ...round, type: "betCashedOut", betId: "b-1", cashout: { multiplier: "1.50", win: "1.50" } },
        {
            ...round,
            type: "myBetAccepted",
            bet: { roundId: "r-88", lane: 1, amount: "1.00", currency: "USD", autoCashout: null, cashout: null },
        },
        { ...round, type: "myBetSettled", cashout: null },
        { ...at, type: "balance", balance: "102.00" },
    ])("parses $type", (event) => {
        expect(crashEventSchema.parse(event).type).toBe(event.type);
    });

    it("rejects an empty snapshot, a round event without lane and a numeric multiplier", () => {
        const empty = { ...at, type: "snapshot", lanes: [], history: [], topWins: [], myBets: [], balance: "1" };
        expect(crashEventSchema.safeParse(empty).success).toBe(false);
        expect(crashEventSchema.safeParse({ ...at, roundId: "r-88", type: "roundStart" }).success).toBe(false);
        expect(crashEventSchema.safeParse({ ...round, type: "tick", multiplier: 1.37 }).success).toBe(false);
    });
});
