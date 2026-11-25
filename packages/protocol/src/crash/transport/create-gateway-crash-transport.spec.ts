import { GameApiError } from "../../common/errors/game-api-error";
import type { CrashConnectionStatus } from "../types/crash-connection-status.type";
import { createGatewayCrashTransport } from "./create-gateway-crash-transport";

const init = {
    session: { token: "session-token", expiresAt: "2026-11-25T20:00:00Z", demo: false },
    game: { id: "prov-a:rocket", provider: "prov-a", family: "crash", clientId: "crash-rocket" },
    money: { balance: "103.00", currency: "USD", decimals: 2 },
    bets: { min: "0.10", max: "100.00", default: "1.00" },
    capabilities: {
        crash: {
            lanes: 1,
            autoCashout: null,
            curve: { kind: "ticks" },
            liveBets: true,
            betWhileRunning: "reject",
            freeRounds: false,
        },
    },
    stream: { kind: "sse", url: "/v1/stream" },
};
const tick = { seq: 5, serverTime: 1, lane: 1, roundId: "r-1", type: "tick", multiplier: "1.10" };
const command = { requestId: "0b8f6a3e-4c1d-4e2a-9f7b-2d5c8e1a6b90", action: "cashout", lane: 1 } as const;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** SSE response that stays open (like a live stream) unless `end` is set. */
function sse(text: string, { end = false } = {}) {
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(text));
            if (end) controller.close();
        },
    });
    return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function setup(...streamResponses: (() => Response)[]) {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, requestInit) => {
        const url = String(input);
        if (url.endsWith("/v1/sessions")) return json(init);
        if (url.endsWith("/v1/play")) return json({ balance: "104.84", cashout: { multiplier: "1.84", win: "1.84" } });
        const next = streamResponses.shift();
        if (!next) return new Promise<Response>(() => undefined);
        requestInit?.signal?.throwIfAborted();
        return next();
    });
    const transport = createGatewayCrashTransport({
        baseUrl: "https://gw.example.com/",
        launchToken: "launch-token",
        fetch,
        retryDelaysMs: [0],
    });
    return { fetch, transport };
}

function handlers() {
    const statuses: CrashConnectionStatus[] = [];
    return {
        statuses,
        onEvent: vi.fn(),
        onStatus: vi.fn((status: CrashConnectionStatus) => void statuses.push(status)),
        onError: vi.fn(),
    };
}

const header = (call: Parameters<typeof fetch> | undefined, name: string) =>
    (call?.[1]?.headers as Record<string, string> | undefined)?.[name];

describe("createGatewayCrashTransport", () => {
    it("init: opens the session with the launch token and parses it", async () => {
        const { fetch, transport } = setup();
        const result = await transport.init();
        expect(result.game.family).toBe("crash");
        const [call] = fetch.mock.calls;
        expect(call?.[0]).toBe("https://gw.example.com/v1/sessions");
        expect(call?.[1]?.method).toBe("POST");
        expect(header(call, "Authorization")).toBe("Bearer launch-token");
    });

    it("play: requires init, then posts the command with the session token", async () => {
        const { fetch, transport } = setup();
        await expect(transport.play(command)).rejects.toThrow("init() first");
        expect(() => transport.subscribe(handlers())).toThrow("init() first");

        await transport.init();
        await expect(transport.play(command)).resolves.toMatchObject({ cashout: { multiplier: "1.84" } });
        const call = fetch.mock.calls[1];
        expect(call?.[0]).toBe("https://gw.example.com/v1/play");
        expect(header(call, "Authorization")).toBe("Bearer session-token");
        expect(JSON.parse(call?.[1]?.body as string)).toEqual(command);
    });

    it("throws GameApiError with the body on a non-2xx response", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("<html>down</html>", { status: 502 }));
        const transport = createGatewayCrashTransport({ baseUrl: "https://gw.example.com", launchToken: "t", fetch });
        const error = await transport.init().catch((e: unknown) => e);
        expect(error).toBeInstanceOf(GameApiError);
        expect(error).toMatchObject({ status: 502, detail: { kind: "unexpected", body: "<html>down</html>" } });
    });

    it("subscribe: emits parsed events, reports unknown and malformed ones", async () => {
        const { fetch, transport } = setup(() =>
            sse(`id: 5\ndata: ${JSON.stringify(tick)}\n\ndata: {"type":"later"}\n\ndata: not json\n\n`)
        );
        await transport.init();
        const h = handlers();
        const close = transport.subscribe(h);

        await vi.waitFor(() => expect(h.onError).toHaveBeenCalledTimes(2));
        expect(h.onEvent).toHaveBeenCalledExactlyOnceWith(tick);
        expect(h.statuses).toEqual(["connecting", "live"]);
        const streamCall = fetch.mock.calls[1];
        expect(streamCall?.[0]).toBe("https://gw.example.com/v1/stream");
        expect(header(streamCall, "Authorization")).toBe("Bearer session-token");
        close();
    });

    it("reconnects after the stream ends or fails, resuming from the last event id", async () => {
        const { fetch, transport } = setup(
            () => sse(`id: 5\ndata: ${JSON.stringify(tick)}\n\n`, { end: true }),
            () => new Response(null, { status: 503 }),
            () => sse(`data: ${JSON.stringify({ ...tick, seq: 6 })}\n\n`)
        );
        await transport.init();
        const h = handlers();
        const close = transport.subscribe(h);

        await vi.waitFor(() => expect(h.onEvent).toHaveBeenCalledTimes(2));
        expect(h.statuses).toEqual(["connecting", "live", "reconnecting", "reconnecting", "live"]);
        expect(header(fetch.mock.calls[1], "Last-Event-ID")).toBeUndefined();
        expect(header(fetch.mock.calls[2], "Last-Event-ID")).toBe("5");
        expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
        close();
    });

    it("goes offline without retrying on 401", async () => {
        const { fetch, transport } = setup(() => new Response(null, { status: 401 }));
        await transport.init();
        const h = handlers();
        transport.subscribe(h);

        await vi.waitFor(() => expect(h.statuses).toEqual(["connecting", "offline"]));
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("stops on close: aborts the stream and reports nothing more", async () => {
        const { fetch, transport } = setup(() => sse(""));
        await transport.init();
        const h = handlers();
        const close = transport.subscribe(h);
        await vi.waitFor(() => expect(h.statuses).toContain("live"));

        close();
        expect(fetch.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(h.onError).not.toHaveBeenCalled();
        expect(h.statuses).toEqual(["connecting", "live"]);
    });

    it("uses the global fetch by default", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async () => json(init));
        vi.stubGlobal("fetch", fetch);
        try {
            await createGatewayCrashTransport({ baseUrl: "https://gw.example.com", launchToken: "t" }).init();
            expect(fetch).toHaveBeenCalledOnce();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
