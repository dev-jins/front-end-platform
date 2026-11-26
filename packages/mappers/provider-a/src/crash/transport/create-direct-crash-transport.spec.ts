import { GameApiError } from "@fep/protocol";
import type { CrashEvent } from "@fep/protocol/crash";

import { clone, myStatsExample, nativeInitExample } from "../../../tests/native-examples";
import type { DirectCrashTransportOptions } from "../types/direct-crash-transport-options.type";
import { createDirectCrashTransport } from "./create-direct-crash-transport";

const GAME_URL = "https://api.example.com/api/v1/game/abc";
const balance = { sessionKey: "abc", currency: "USD", amount: "101.00" };
const requestId = "0b8f6a3e-4c1d-4e2a-9f7b-2d5c8e1a6b90";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const sseLine = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;

/** A live SSE response whose messages the test pushes in. */
function liveStream() {
    let push: (text: string) => void = () => undefined;
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            push = (text) => controller.enqueue(new TextEncoder().encode(text));
        },
    });
    return { response: new Response(body, { status: 200 }), push: (text: string) => push(text) };
}

function setup({
    stats = [myStatsExample] as unknown[],
    stream = liveStream(),
    routes = {} as Record<string, Response>,
}) {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
        const url = String(input);
        if (url.startsWith("https://mercure.example.com")) {
            init?.signal?.throwIfAborted();
            return stream.response;
        }
        if (url === `${GAME_URL}/crash/myStats`) return json(stats.length > 1 ? stats.shift() : stats[0]);
        if (url === GAME_URL) return json(nativeInitExample);
        return routes[url] ?? new Response(null, { status: 404 });
    });
    const options: DirectCrashTransportOptions = {
        baseUrl: "https://api.example.com/",
        sessionKey: "abc",
        game: { id: "prov-a:rocket", provider: "prov-a", clientId: "crash-rocket" },
        demo: false,
        decimals: 2,
        bets: { min: "0.10", max: "100.00", default: "1.00" },
        capabilities: {
            lanes: 1,
            autoCashout: { min: "1.01" },
            curve: { kind: "ticks" },
            liveBets: true,
            betWhileRunning: "reject",
            freeRounds: false,
        },
        fetch,
        retryDelaysMs: [0],
        resyncDelayMs: 0,
    };
    return { fetch, stream, transport: createDirectCrashTransport(options) };
}

function handlers() {
    const events: CrashEvent[] = [];
    return { events, onEvent: vi.fn((e: CrashEvent) => void events.push(e)), onStatus: vi.fn(), onError: vi.fn() };
}

const myStatsCalls = (fetch: ReturnType<typeof setup>["fetch"]) =>
    fetch.mock.calls.filter(([url]) => String(url).endsWith("/crash/myStats")).length;
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("createDirectCrashTransport", () => {
    it("init: GETs the game once and returns a canonical init", async () => {
        const { fetch, transport } = setup({});
        const init = await transport.init();
        expect(fetch.mock.calls[0]?.[0]).toBe(GAME_URL);
        expect(init).toMatchObject({
            session: { token: "abc", expiresAt: null, demo: false },
            game: { id: "prov-a:rocket", family: "crash" },
            money: { balance: "102.00", currency: "USD", decimals: 2 },
            stream: { kind: "sse", url: "https://mercure.example.com/.well-known/mercure" },
        });
    });

    it("play: requires init, then posts the native command with the fingerprint", async () => {
        const { fetch, transport } = setup({
            routes: {
                [`${GAME_URL}/crash/bet`]: json({ balance }),
                [`${GAME_URL}/crash/push`]: json({ multiplier: "1.84", winAmount: "1.84", balance }),
            },
        });
        await expect(transport.play({ requestId, action: "cashout", lane: 1 })).rejects.toThrow("init() first");
        expect(() => transport.subscribe(handlers())).toThrow("init() first");

        await transport.init();
        await expect(
            transport.play({ requestId, action: "bet", lane: 1, bet: "1.00", autoCashout: "2.00" })
        ).resolves.toEqual({ balance: "101.00" });
        const [url, init] = fetch.mock.calls[1] ?? [];
        expect(url).toBe(`${GAME_URL}/crash/bet`);
        expect(init?.method).toBe("POST");
        expect(JSON.parse(init?.body as string)).toEqual({
            fingerprint: "ZmluZ2VycHJpbnQ=",
            bet: "1.00",
            autoCashout: "2.00",
        });

        await expect(transport.play({ requestId, action: "cashout", lane: 1 })).resolves.toEqual({
            balance: "101.00",
            cashout: { multiplier: "1.84", win: "1.84" },
        });
    });

    it("play: turns a 422 into a business GameApiError", async () => {
        const { transport } = setup({
            routes: {
                [`${GAME_URL}/crash/push`]: json({ errorCode: 1, errorLevel: "ALERT", errorMessage: "Too late" }, 422),
            },
        });
        await transport.init();
        const error = await transport.play({ requestId, action: "cashout", lane: 1 }).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(GameApiError);
        expect(error).toMatchObject({ detail: { kind: "business", message: "Too late" } });
    });

    it("subscribe: one connection to both topics, snapshot first, then ticks", async () => {
        const { fetch, stream, transport } = setup({});
        await transport.init();
        const h = handlers();
        const close = transport.subscribe(h);

        stream.push(sseLine({ type: "tick", multiplier: 1.2 }));
        await vi.waitFor(() => expect(h.events.map((e) => e.type)).toEqual(["snapshot"]));
        stream.push(sseLine({ type: "tick", multiplier: 1.4 }));
        await vi.waitFor(() => expect(h.events).toHaveLength(2));

        expect(h.events[1]).toMatchObject({ seq: 2, type: "tick", lane: 1, roundId: "88", multiplier: "1.4" });
        const mercure = fetch.mock.calls.find(([url]) => String(url).startsWith("https://mercure"));
        const url = new URL(String(mercure?.[0]));
        expect(url.searchParams.getAll("topic")).toEqual(["crash/rocket/public", "crash/rocket/player/42"]);
        expect((mercure?.[1]?.headers as Record<string, string> | undefined)?.Authorization).toBe("Bearer sub-token");
        expect(h.onStatus.mock.calls.map(([s]) => s)).toEqual(["connecting", "live"]);
        close();
    });

    it("subscribe: merges a burst of other events into one more snapshot", async () => {
        const next = { ...clone(myStatsExample), roundId: 89, state: "countDown" };
        const { fetch, stream, transport } = setup({ stats: [myStatsExample, next] });
        await transport.init();
        const h = handlers();
        const close = transport.subscribe(h);
        await vi.waitFor(() => expect(h.events).toHaveLength(1));

        stream.push(sseLine({ type: "crash" }) + sseLine({ type: "round_start" }) + sseLine({ type: "bet_added" }));
        await vi.waitFor(() => expect(h.events).toHaveLength(2));
        await settle();

        expect(myStatsCalls(fetch)).toBe(2);
        expect(h.events[1]).toMatchObject({ seq: 2, type: "snapshot", lanes: [{ roundId: "89", phase: "countdown" }] });
        close();
    });

    it("subscribe: resyncs on a tick it cannot translate", async () => {
        const { fetch, stream, transport } = setup({});
        await transport.init();
        const h = handlers();
        const close = transport.subscribe(h);
        await vi.waitFor(() => expect(h.events).toHaveLength(1));

        stream.push(sseLine({ type: "tick" }));
        await vi.waitFor(() => expect(myStatsCalls(fetch)).toBe(2));
        close();
    });

    it("subscribe: reports malformed events and a failed snapshot, keeps going", async () => {
        const { stream, transport } = setup({ stats: [{ ...clone(myStatsExample), state: "paused" }] });
        await transport.init();
        const h = handlers();
        const close = transport.subscribe(h);

        await vi.waitFor(() =>
            expect(h.onError).toHaveBeenCalledWith(new Error('Provider A: unknown crash state "paused"'))
        );
        stream.push("data: not json\n\n");
        stream.push(sseLine({ multiplier: 1 }));
        await vi.waitFor(() => expect(h.onError).toHaveBeenCalledTimes(3));
        expect(h.events).toEqual([]);
        close();
    });

    it("close: no events after closing, even from a snapshot in flight", async () => {
        const { stream, transport } = setup({});
        await transport.init();
        const h = handlers();
        const close = transport.subscribe(h);
        await vi.waitFor(() => expect(h.events).toHaveLength(1));

        stream.push(sseLine({ type: "crash" }));
        close();
        await settle();
        expect(h.events).toHaveLength(1);
        expect(h.onError).not.toHaveBeenCalled();
    });

    it("uses the global fetch by default", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async () => json(nativeInitExample));
        vi.stubGlobal("fetch", fetch);
        try {
            const { capabilities, bets } = {
                capabilities: {
                    lanes: 1,
                    autoCashout: null,
                    curve: { kind: "ticks" },
                    liveBets: false,
                    betWhileRunning: "reject",
                    freeRounds: false,
                } as const,
                bets: { min: "1", max: "1", default: "1" },
            };
            await createDirectCrashTransport({
                baseUrl: "https://api.example.com",
                sessionKey: "abc",
                game: { id: "g", provider: "p", clientId: "c" },
                demo: true,
                decimals: 2,
                bets,
                capabilities,
            }).init();
            expect(fetch).toHaveBeenCalledOnce();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
