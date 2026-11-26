import { GameApiError } from "@fep/protocol";
import type {
    CrashCommand,
    CrashCommandResult,
    CrashEvent,
    CrashInit,
    CrashStreamHandlers,
    CrashTransport,
    LaneState,
} from "@fep/protocol/crash";

import { createCrashSession } from "./create-crash-session";

const T = 1764090000000;
const init: CrashInit = {
    session: { token: "t", expiresAt: null, demo: false },
    game: { id: "prov-a:rocket", provider: "prov-a", family: "crash", clientId: "crash-rocket" },
    money: { balance: "100.00", currency: "USD", decimals: 2 },
    bets: { min: "0.10", max: "100.00", default: "1.00" },
    capabilities: {
        crash: {
            lanes: 1,
            autoCashout: { min: "1.01" },
            curve: { kind: "ticks" },
            liveBets: true,
            betWhileRunning: "reject",
            freeRounds: false,
        },
    },
    stream: { kind: "sse", url: "/v1/stream" },
};
const lane: LaneState = {
    lane: 1,
    roundId: "r-1",
    phase: "countdown",
    countdownEndsAt: T + 5000,
    startAt: null,
    multiplier: "1.00",
    crashPoint: null,
    myBet: null,
    bets: [],
};
const snapshot = (patch: Partial<LaneState> = {}, seq = 1): CrashEvent => ({
    seq,
    serverTime: T,
    type: "snapshot",
    lanes: [{ ...lane, ...patch }],
    history: [],
    topWins: [],
    myBets: [],
    balance: "100.00",
});
const myBet = { roundId: "r-1", lane: 1, amount: "1.00", currency: "USD", autoCashout: null, cashout: null } as const;
const businessError = (code: number, level: "CRITICAL" | "ALERT" | "WARNING") =>
    new GameApiError(422, { kind: "business", code, level, message: `error ${code}` });

/** Transport whose stream the test drives; `play` answers from `results` in order (Error = rejection). */
function fakeTransport(results: (CrashCommandResult | Error)[] = [], initResponse: CrashInit = init) {
    let handlers: CrashStreamHandlers | undefined;
    const unsubscribe = vi.fn();
    const transport = {
        init: vi.fn<CrashTransport["init"]>(async () => initResponse),
        play: vi.fn<CrashTransport["play"]>(async () => {
            const result = results.shift();
            if (result instanceof Error || result === undefined) throw result ?? new Error("no result");
            return result;
        }),
        subscribe: vi.fn<CrashTransport["subscribe"]>((h) => {
            handlers = h;
            return unsubscribe;
        }),
    };
    const stream = () => {
        if (!handlers) throw new Error("not subscribed");
        return handlers;
    };
    return { transport, stream, unsubscribe };
}

async function setup(
    results: (CrashCommandResult | Error)[] = [],
    { live = true, lanePatch = {}, crash = {} }: { live?: boolean; lanePatch?: Partial<LaneState>; crash?: object } = {}
) {
    const capabilities = { crash: { ...init.capabilities.crash, ...crash } };
    const fake = fakeTransport(results, { ...init, capabilities });
    const flushes: (() => void)[] = [];
    const onWarning = vi.fn();
    let n = 0;
    const session = createCrashSession({
        transport: fake.transport,
        onWarning,
        onStreamError: vi.fn(),
        createRequestId: () => `req-${++n}`,
        now: () => T,
        scheduleFlush: (flush) => void flushes.push(flush),
    });
    const flush = () => {
        for (const f of flushes.splice(0)) f();
    };
    await session.start();
    if (live) {
        fake.stream().onStatus("live");
        fake.stream().onEvent(snapshot(lanePatch));
        flush();
    }
    const state = () => session.store.getState();
    const sentCommands = () => fake.transport.play.mock.calls.map(([c]) => c as CrashCommand);
    return { ...fake, session, state, flush, flushes, onWarning, sentCommands };
}

describe("start", () => {
    it("inits once, subscribes, and is ready with the init balance", async () => {
        const { session, transport, state } = await setup([], { live: false });
        await session.start();
        expect(transport.init).toHaveBeenCalledOnce();
        expect(transport.subscribe).toHaveBeenCalledOnce();
        expect(state()).toMatchObject({ phase: "ready", init, balance: "100.00", connection: "connecting" });
    });

    it("ends the session when init fails, even on a network error", async () => {
        const fake = fakeTransport();
        fake.transport.init.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        const session = createCrashSession({ transport: fake.transport });
        await session.start();
        expect(session.store.getState()).toMatchObject({ phase: "over", error: { level: "CRITICAL" } });
        expect(fake.transport.subscribe).not.toHaveBeenCalled();
    });

    it("does not subscribe when stopped during init", async () => {
        const fake = fakeTransport();
        const session = createCrashSession({ transport: fake.transport });
        const starting = session.start();
        session.stop();
        await starting;
        expect(fake.transport.subscribe).not.toHaveBeenCalled();
    });
});

describe("stream", () => {
    it("applies a burst of events in one store update", async () => {
        const { stream, flushes, flush, session, state } = await setup();
        const listener = vi.fn();
        session.store.subscribe(listener);

        stream().onEvent({ seq: 2, serverTime: T, type: "running", lane: 1, roundId: "r-1", startAt: T });
        stream().onEvent({ seq: 3, serverTime: T, type: "tick", lane: 1, roundId: "r-1", multiplier: "1.20" });
        expect(flushes).toHaveLength(1);
        flush();

        expect(listener).toHaveBeenCalledOnce();
        expect(state().lanes[1]).toMatchObject({ phase: "running", multiplier: "1.20" });
    });

    it("tracks the connection; offline ends the session", async () => {
        const { stream, state } = await setup();
        stream().onStatus("reconnecting");
        expect(state().connection).toBe("reconnecting");
        stream().onStatus("offline");
        expect(state()).toMatchObject({ phase: "over", error: { level: "CRITICAL" } });
    });

    it("stop: unsubscribes and drops queued events", async () => {
        const { stream, flushes, session, unsubscribe, state } = await setup();
        stream().onEvent({ seq: 2, serverTime: T, type: "balance", balance: "1.00" });
        session.stop();
        for (const f of flushes) f();
        expect(unsubscribe).toHaveBeenCalledOnce();
        expect(state().balance).toBe("100.00");
    });
});

describe("bet", () => {
    it("sends the bet with a request id, marks it pending, then applies the result", async () => {
        const bet = { ...myBet, autoCashout: "2.00" };
        const { session, state, sentCommands } = await setup([{ balance: "99.00", bet }]);
        const sending = session.bet(1, "1.00", "2.00");
        expect(state().lanes[1]?.pending).toBe("bet");

        await expect(sending).resolves.toBe(true);
        expect(sentCommands()).toEqual([
            { requestId: "req-1", action: "bet", lane: 1, bet: "1.00", autoCashout: "2.00" },
        ]);
        expect(state().lanes[1]).toMatchObject({ pending: null, myBet: bet });
        expect(state().balance).toBe("99.00");
    });

    it.each([
        ["below the minimum", "0.01", undefined],
        ["above the maximum", "500.00", undefined],
        ["not a numeric string", "1e3", undefined],
        ["auto cash-out below the minimum", "1.00", "1.00"],
    ])("refuses a bet %s", async (_, amount, autoCashout) => {
        const { session, transport } = await setup();
        await expect(session.bet(1, amount, autoCashout)).resolves.toBe(false);
        expect(transport.play).not.toHaveBeenCalled();
    });

    it("refuses auto cash-out when the provider has none", async () => {
        const { session } = await setup([], { crash: { autoCashout: null } });
        await expect(session.bet(1, "1.00", "2.00")).resolves.toBe(false);
    });

    it("refuses outside the countdown, with a bet already placed, or while not live", async () => {
        expect(await (await setup([], { lanePatch: { phase: "running" } })).session.bet(1, "1.00")).toBe(false);
        expect(await (await setup([], { lanePatch: { myBet } })).session.bet(1, "1.00")).toBe(false);
        const notLive = await setup();
        notLive.stream().onStatus("reconnecting");
        expect(await notLive.session.bet(1, "1.00")).toBe(false);
        expect(await notLive.session.bet(2, "1.00")).toBe(false);
    });

    it("refuses a second command while one is in flight", async () => {
        const { session } = await setup([{ balance: "99.00" }]);
        const first = session.bet(1, "1.00");
        await expect(session.bet(1, "1.00")).resolves.toBe(false);
        await first;
    });

    it("allows betting while running when the provider queues for the next round", async () => {
        const { session } = await setup([{ balance: "99.00" }], {
            lanePatch: { phase: "running" },
            crash: { betWhileRunning: "nextRound" },
        });
        await expect(session.bet(1, "1.00")).resolves.toBe(true);
    });
});

describe("cancelBet", () => {
    it("cancels during the countdown", async () => {
        const { session, state, sentCommands } = await setup([{ balance: "100.00" }], { lanePatch: { myBet } });
        await expect(session.cancelBet(1)).resolves.toBe(true);
        expect(sentCommands()[0]).toEqual({ requestId: "req-1", action: "cancelBet", lane: 1 });
        expect(state().lanes[1]?.myBet).toBeNull();
    });

    it("refuses without a bet or once running", async () => {
        expect(await (await setup()).session.cancelBet(1)).toBe(false);
        expect(await (await setup([], { lanePatch: { myBet, phase: "running" } })).session.cancelBet(1)).toBe(false);
    });
});

describe("cashout", () => {
    const running = { phase: "running", myBet } as const;

    it("cashes out with the server's multiplier", async () => {
        const cashout = { multiplier: "1.84", win: "1.84" };
        const { session, state } = await setup([{ balance: "101.84", cashout }], { lanePatch: running });
        await expect(session.cashout(1)).resolves.toBe(true);
        expect(state().lanes[1]?.myBet?.cashout).toEqual(cashout);
        expect(state().balance).toBe("101.84");
    });

    it("refuses when not running, already cashed out, or the bet is for another round", async () => {
        expect(await (await setup([], { lanePatch: { myBet } })).session.cashout(1)).toBe(false);
        const cashedOut = { ...myBet, cashout: { multiplier: "1.5", win: "1.5" } };
        expect(await (await setup([], { lanePatch: { ...running, myBet: cashedOut } })).session.cashout(1)).toBe(false);
        const nextRound = { ...myBet, roundId: "r-2" };
        expect(await (await setup([], { lanePatch: { ...running, myBet: nextRound } })).session.cashout(1)).toBe(false);
    });
});

describe("errors", () => {
    const running = { phase: "running", myBet } as const;

    it("ALERT: shows the error, clears pending, keeps the bet; dismissError closes it", async () => {
        const { session, state } = await setup([businessError(1, "ALERT")], { lanePatch: running });
        await expect(session.cashout(1)).resolves.toBe(true);
        expect(state()).toMatchObject({ phase: "ready", error: { code: 1, level: "ALERT" } });
        expect(state().lanes[1]).toMatchObject({ pending: null, myBet });
        expect(await session.cashout(1)).toBe(false);
        session.dismissError();
        expect(state().error).toBeNull();
    });

    it("a network failure is an ALERT, not the end of the session", async () => {
        const { session, state } = await setup([new TypeError("Failed to fetch")], { lanePatch: running });
        await session.cashout(1);
        expect(state()).toMatchObject({ phase: "ready", error: { code: null, level: "ALERT" } });
    });

    it("CRITICAL ends the session and cannot be dismissed", async () => {
        const { session, state } = await setup([businessError(109, "CRITICAL")], { lanePatch: running });
        await session.cashout(1);
        session.dismissError();
        expect(state()).toMatchObject({ phase: "over", error: { code: 109 } });
    });

    it("WARNING only goes to onWarning", async () => {
        const { session, state, onWarning } = await setup([businessError(300, "WARNING")], { lanePatch: running });
        await session.cashout(1);
        expect(onWarning).toHaveBeenCalledWith({ code: 300, level: "WARNING", message: "error 300" });
        expect(state().error).toBeNull();
    });
});

describe("defaults", () => {
    it("flushes on a timer and creates uuid request ids", async () => {
        vi.useFakeTimers();
        try {
            const fake = fakeTransport([{ balance: "99.00" }]);
            const session = createCrashSession({ transport: fake.transport });
            await session.start();
            fake.stream().onStatus("live");
            fake.stream().onEvent(snapshot());
            expect(session.store.getState().lanes[1]).toBeUndefined();
            await vi.advanceTimersByTimeAsync(16);
            expect(session.store.getState().lanes[1]?.phase).toBe("countdown");

            await session.bet(1, "1.00");
            expect((fake.transport.play.mock.calls[0]?.[0] as CrashCommand | undefined)?.requestId).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
            );
        } finally {
            vi.useRealTimers();
        }
    });
});
