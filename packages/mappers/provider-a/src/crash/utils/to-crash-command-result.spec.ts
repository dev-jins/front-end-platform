import { toCrashCommandResult } from "./to-crash-command-result";

const balance = { sessionKey: "abc", currency: "USD", amount: "104.84" };

describe("toCrashCommandResult", () => {
    it("returns the balance for bet and cancelBet", () => {
        expect(toCrashCommandResult("bet", { balance })).toEqual({ balance: "104.84" });
        expect(toCrashCommandResult("cancelBet", { balance })).toEqual({ balance: "104.84" });
    });

    it("maps push to a cash-out", () => {
        expect(toCrashCommandResult("push", { multiplier: 1.84, winAmount: "1.84", balance })).toEqual({
            balance: "104.84",
            cashout: { multiplier: "1.84", win: "1.84" },
        });
    });

    it("throws on an unexpected body", () => {
        expect(() => toCrashCommandResult("push", { balance })).toThrow();
    });
});
