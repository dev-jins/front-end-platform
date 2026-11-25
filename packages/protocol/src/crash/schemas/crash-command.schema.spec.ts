import { crashCommandSchema } from "./crash-command.schema";
import { crashCommandResultSchema } from "./crash-command-result.schema";

const requestId = "0b8f6a3e-4c1d-4e2a-9f7b-2d5c8e1a6b90";

describe("crashCommandSchema", () => {
    it("parses bet, cancelBet and cashout", () => {
        expect(
            crashCommandSchema.parse({ requestId, action: "bet", lane: 1, bet: "1.00", autoCashout: "2.00" })
        ).toMatchObject({ action: "bet", autoCashout: "2.00" });
        expect(crashCommandSchema.parse({ requestId, action: "cancelBet", lane: 2 }).action).toBe("cancelBet");
        expect(crashCommandSchema.parse({ requestId, action: "cashout", lane: 3 }).action).toBe("cashout");
    });

    it("requires a uuid requestId, a lane and a string bet", () => {
        expect(crashCommandSchema.safeParse({ requestId: "1", action: "cashout", lane: 1 }).success).toBe(false);
        expect(crashCommandSchema.safeParse({ requestId, action: "cashout" }).success).toBe(false);
        expect(crashCommandSchema.safeParse({ requestId, action: "bet", lane: 1, bet: 1 }).success).toBe(false);
    });
});

describe("crashCommandResultSchema", () => {
    it("parses a cash-out result", () => {
        const result = crashCommandResultSchema.parse({
            balance: "104.84",
            cashout: { multiplier: "1.84", win: "1.84" },
        });
        expect(result.cashout?.multiplier).toBe("1.84");
        expect(result.bet).toBeUndefined();
    });
});
