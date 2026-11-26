import { crashInitSchema } from "./crash-init.schema";

const init = {
    session: { token: "gw-token", expiresAt: "2026-11-25T20:00:00Z", demo: false },
    game: { id: "prov-a:rocket", provider: "prov-a", family: "crash", clientId: "crash-rocket" },
    money: { balance: "103.00", currency: "USD", decimals: 2 },
    bets: { min: "0.10", max: "100.00", default: "1.00" },
    capabilities: {
        crash: {
            lanes: 3,
            autoCashout: { min: "1.01" },
            curve: { kind: "exp", k: 0.00006 },
            liveBets: true,
            betWhileRunning: "reject",
            freeRounds: false,
        },
    },
    stream: { kind: "sse", url: "/v1/stream" },
};

describe("crashInitSchema", () => {
    it("parses a lane game with an exp curve", () => {
        const parsed = crashInitSchema.parse(init);
        expect(parsed.capabilities.crash.curve).toEqual({ kind: "exp", k: 0.00006 });
    });

    it("accepts a provider without a session expiry", () => {
        const session = { ...init.session, expiresAt: null };
        expect(crashInitSchema.parse({ ...init, session }).session.expiresAt).toBeNull();
    });

    it("accepts a provider without auto cash-out and with ticks only", () => {
        const crash = { ...init.capabilities.crash, lanes: 1, autoCashout: null, curve: { kind: "ticks" } };
        expect(crashInitSchema.parse({ ...init, capabilities: { crash } }).capabilities.crash.autoCashout).toBeNull();
    });

    it("rejects a slot game, 2 lanes and an unknown stream kind", () => {
        expect(crashInitSchema.safeParse({ ...init, game: { ...init.game, family: "slot" } }).success).toBe(false);
        const crash = { ...init.capabilities.crash, lanes: 2 };
        expect(crashInitSchema.safeParse({ ...init, capabilities: { crash } }).success).toBe(false);
        expect(crashInitSchema.safeParse({ ...init, stream: { kind: "ws", url: "/v1/stream" } }).success).toBe(false);
    });

    it("keeps money as strings", () => {
        expect(crashInitSchema.safeParse({ ...init, money: { ...init.money, balance: 103 } }).success).toBe(false);
    });
});
