import type { CrashEvent } from "@fep/protocol/crash";

import { createDevCrashTransport } from "./create-dev-crash-transport";

const T = 1764090000000;

/** Collects the whole timeline: fake timers run the mock's replay to the end. */
async function timelineOf(random: () => number) {
    let clock = T;
    const transport = createDevCrashTransport({ now: () => clock, random });
    const events: CrashEvent[] = [];
    vi.useFakeTimers({ loopLimit: 100_000 });
    try {
        const close = transport.subscribe({ onEvent: (e) => void events.push(e), onStatus: () => undefined });
        await vi.runAllTimersAsync();
        close();
    } finally {
        vi.useRealTimers();
    }
    return { transport, events, setClock: (time: number) => (clock = time) };
}

const requestId = "0b8f6a3e-4c1d-4e2a-9f7b-2d5c8e1a6b90";

describe("createDevCrashTransport", () => {
    it("starts with a snapshot, then rounds in time order with increasing seq", async () => {
        const { events } = await timelineOf(() => 0.5);
        expect(events[0]?.type).toBe("snapshot");
        expect(events.every((e, i) => e.seq === i + 1)).toBe(true);
        expect(events.every((e, i) => i === 0 || e.serverTime >= (events[i - 1]?.serverTime ?? 0))).toBe(true);

        const firstRound = events.filter((e) => "roundId" in e && e.roundId === "r-1").map((e) => e.type);
        expect(firstRound.slice(0, 2)).toEqual(["roundStart", "countdown"]);
        expect(firstRound).toContain("running");
        expect(firstRound.at(-1)).toBe("crash");
    });

    it("bet in the countdown, cash out while running at the curve's multiplier", async () => {
        const { transport, events, setClock } = await timelineOf(() => 0.9); // crash point 9.9x
        const countdown = events.find((e) => e.type === "countdown");
        const running = events.find((e) => e.type === "running");
        if (countdown?.type !== "countdown" || running?.type !== "running") throw new Error("no round");

        setClock(countdown.serverTime + 1000);
        await expect(transport.play({ requestId, action: "bet", lane: 1, bet: "10.00" })).resolves.toMatchObject({
            balance: "990.00",
            bet: { roundId: "r-1", amount: "10.00" },
        });
        await expect(transport.play({ requestId, action: "bet", lane: 1, bet: "1.00" })).rejects.toThrow("Already bet");

        setClock(running.startAt + 7000); // 2x
        await expect(transport.play({ requestId, action: "cashout", lane: 1 })).resolves.toEqual({
            balance: "1010.00",
            cashout: { multiplier: "2.00", win: "20.00" },
        });
    });

    it("cancels in the countdown; refuses late bets, late cash-outs and overdrafts", async () => {
        const { transport, events, setClock } = await timelineOf(() => 0.5); // crash point 1.98x
        const countdown = events.find((e) => e.type === "countdown");
        const crash = events.find((e) => e.type === "crash");
        if (countdown?.type !== "countdown" || crash?.type !== "crash") throw new Error("no round");

        setClock(countdown.serverTime);
        await expect(transport.play({ requestId, action: "bet", lane: 1, bet: "5000.00" })).rejects.toThrow(
            "Not enough money"
        );
        await transport.play({ requestId, action: "bet", lane: 1, bet: "1.00" });
        await expect(transport.play({ requestId, action: "cancelBet", lane: 1 })).resolves.toEqual({
            balance: "1000.00",
        });
        await expect(transport.play({ requestId, action: "cashout", lane: 1 })).rejects.toThrow("No bet");

        await transport.play({ requestId, action: "bet", lane: 1, bet: "1.00" });
        setClock(crash.serverTime + 1);
        await expect(transport.play({ requestId, action: "cashout", lane: 1 })).rejects.toThrow("Too late");
        await expect(transport.play({ requestId, action: "bet", lane: 1, bet: "1.00" })).rejects.toThrow("closed");

        setClock(T - 10_000);
        await expect(transport.play({ requestId, action: "bet", lane: 1, bet: "1.00" })).rejects.toThrow("No round");
    });

    it("refuses to cancel once the round runs", async () => {
        const { transport, events, setClock } = await timelineOf(() => 0.9);
        const countdown = events.find((e) => e.type === "countdown");
        const running = events.find((e) => e.type === "running");
        if (countdown?.type !== "countdown" || running?.type !== "running") throw new Error("no round");
        setClock(countdown.serverTime);
        await transport.play({ requestId, action: "bet", lane: 1, bet: "1.00" });
        setClock(running.startAt + 10);
        await expect(transport.play({ requestId, action: "cancelBet", lane: 1 })).rejects.toThrow("closed");
    });
});
