import { toNativeCommand } from "./to-native-command";

const requestId = "0b8f6a3e-4c1d-4e2a-9f7b-2d5c8e1a6b90";

describe("toNativeCommand", () => {
    it("maps bet with fingerprint and auto cash-out, dropping the lane", () => {
        expect(toNativeCommand({ requestId, action: "bet", lane: 1, bet: "1.00", autoCashout: "2.00" }, "fp")).toEqual({
            path: "bet",
            body: { fingerprint: "fp", bet: "1.00", autoCashout: "2.00" },
        });
        expect(toNativeCommand({ requestId, action: "bet", lane: 1, bet: "1.00" }, undefined)).toEqual({
            path: "bet",
            body: { bet: "1.00" },
        });
    });

    it("maps cashout to push and cancelBet as is", () => {
        expect(toNativeCommand({ requestId, action: "cashout", lane: 1 }, "fp")).toEqual({
            path: "push",
            body: { fingerprint: "fp" },
        });
        expect(toNativeCommand({ requestId, action: "cancelBet", lane: 1 }, undefined).path).toBe("cancelBet");
    });
});
