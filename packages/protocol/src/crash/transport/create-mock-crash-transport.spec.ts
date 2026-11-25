import type { CrashEvent } from "../types/crash-event.type";
import type { CrashInit } from "../types/crash-init.type";
import { createMockCrashTransport } from "./create-mock-crash-transport";

const init = { session: { token: "t" } } as CrashInit;
const round = { lane: 1, roundId: "r-1" } as const;
const events: CrashEvent[] = [
    { seq: 1, serverTime: 1000, type: "balance", balance: "10.00" },
    { seq: 2, serverTime: 3000, type: "tick", multiplier: "1.10", ...round },
    { seq: 3, serverTime: 5000, type: "crash", crashPoint: "1.20", ...round },
];

describe("createMockCrashTransport", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("returns the init and replays the timeline by serverTime", async () => {
        const transport = createMockCrashTransport({ init, events, speed: 2 });
        await expect(transport.init()).resolves.toBe(init);

        const onEvent = vi.fn();
        const onStatus = vi.fn();
        transport.subscribe({ onEvent, onStatus });
        expect(onStatus).toHaveBeenLastCalledWith("connecting");

        await vi.advanceTimersByTimeAsync(0);
        expect(onStatus).toHaveBeenLastCalledWith("live");
        expect(onEvent).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(999);
        expect(onEvent).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(onEvent).toHaveBeenCalledTimes(2);
    });

    it("emits everything at once with speed Infinity, nothing after unsubscribe", async () => {
        const onEvent = vi.fn();
        createMockCrashTransport({ init, events, speed: Infinity }).subscribe({ onEvent, onStatus: vi.fn() });
        await vi.advanceTimersByTimeAsync(0);
        expect(onEvent.mock.calls.map(([event]) => event.seq)).toEqual([1, 2, 3]);

        const late = vi.fn();
        const close = createMockCrashTransport({ init, events }).subscribe({ onEvent: late, onStatus: vi.fn() });
        close();
        await vi.advanceTimersByTimeAsync(10_000);
        expect(late).not.toHaveBeenCalled();
    });

    it("handles an empty timeline", async () => {
        const onStatus = vi.fn();
        createMockCrashTransport({ init, events: [] }).subscribe({ onEvent: vi.fn(), onStatus });
        await vi.advanceTimersByTimeAsync(0);
        expect(onStatus).toHaveBeenLastCalledWith("live");
    });

    it("answers play with the handler, rejects without one", async () => {
        const command = { requestId: "id", action: "cashout", lane: 1 } as const;
        const play = vi.fn(() => ({ balance: "11.00" }));
        await expect(createMockCrashTransport({ init, events, play }).play(command)).resolves.toEqual({
            balance: "11.00",
        });
        expect(play).toHaveBeenCalledWith(command);
        await expect(createMockCrashTransport({ init, events }).play(command)).rejects.toThrow("no play handler");
    });
});
