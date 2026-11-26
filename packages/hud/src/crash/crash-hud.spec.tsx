import { createCrashSession } from "@fep/game-core/crash";
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
import { act, fireEvent, render, screen } from "@testing-library/react";

import { CrashHud } from "./crash-hud";

const T = 1764090000000;
const baseInit: CrashInit = {
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
    bets: [{ id: "b-1", username: "alice", amount: "5.00", currency: "USD", multiplier: "1.50", win: "7.50" }],
};
const myBet = { roundId: "r-1", lane: 1, amount: "1.00", currency: "USD", autoCashout: null, cashout: null } as const;
let seq = 0;
const snapshot = (lanes: LaneState[]): CrashEvent => ({
    seq: ++seq,
    serverTime: T,
    type: "snapshot",
    lanes,
    history: [
        { roundId: "r-0", crashPoint: "3.10", ts: T },
        { roundId: "r-00", crashPoint: "1.20", ts: T },
    ],
    topWins: [],
    myBets: [],
    balance: "100.00",
});

async function renderHud({
    results = [] as (CrashCommandResult | Error)[],
    lanes = [lane],
    crash = {},
    onReload = vi.fn(),
} = {}) {
    let handlers: CrashStreamHandlers | undefined;
    const init = { ...baseInit, capabilities: { crash: { ...baseInit.capabilities.crash, ...crash } } };
    const transport = {
        init: vi.fn<CrashTransport["init"]>(async () => init),
        play: vi.fn<CrashTransport["play"]>(async () => {
            const result = results.shift();
            if (result === undefined || result instanceof Error) throw result ?? new Error("no result");
            return result;
        }),
        subscribe: vi.fn<CrashTransport["subscribe"]>((h) => {
            handlers = h;
            return () => undefined;
        }),
    };
    const session = createCrashSession({
        transport,
        onStreamError: () => undefined,
        createRequestId: () => "req",
        scheduleFlush: (flush) => queueMicrotask(flush),
    });
    render(<CrashHud session={session} onReload={onReload} locale="en-US" />);
    await act(() => session.start());
    const emit = (event: CrashEvent) => act(async () => handlers?.onEvent(event));
    const status = (s: Parameters<CrashStreamHandlers["onStatus"]>[0]) => act(async () => handlers?.onStatus(s));
    await status("live");
    await emit(snapshot(lanes));
    const sent = () => transport.play.mock.calls.map(([command]) => command as CrashCommand);
    return { session, transport, emit, status, sent, onReload };
}

const button = (name: string | RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;
const click = (name: string | RegExp) => act(async () => void fireEvent.click(button(name)));
const type = (label: string | RegExp, value: string) =>
    act(async () => void fireEvent.change(screen.getByLabelText(label), { target: { value } }));

beforeEach(() => {
    seq = 0;
});

describe("CrashHud", () => {
    it("shows loading until init lands", () => {
        const session = createCrashSession({
            transport: { init: () => new Promise(() => undefined), play: vi.fn(), subscribe: vi.fn() },
        });
        render(<CrashHud session={session} />);
        expect(screen.getByText("Loading…")).toBeTruthy();
    });

    it("shows balance, recent crash points and live bets", async () => {
        await renderHud();
        expect(screen.getByText("$100.00")).toBeTruthy();
        expect(screen.getByRole("list", { name: "Recent rounds" }).textContent).toBe("3.10x1.20x");
        expect(screen.getByRole("region", { name: "Live bets" }).textContent).toContain("alice$5.001.50x · $7.50");
    });

    it("bets the typed amount with auto cash-out, then offers Cancel", async () => {
        const { sent } = await renderHud({ results: [{ balance: "98.00", bet: { ...myBet, amount: "2.00" } }] });
        await type(/^Amount/, "2.00");
        await act(async () => void fireEvent.click(screen.getByLabelText("Auto cash-out at")));
        await type("Auto cash-out multiplier", "3.00");
        await click("Bet $2.00");

        expect(sent()).toEqual([{ requestId: "req", action: "bet", lane: 1, bet: "2.00", autoCashout: "3.00" }]);
        expect(screen.getByText("$98.00")).toBeTruthy();
        expect(button("Cancel").disabled).toBe(false);
    });

    it("disables Bet for an amount outside the limits", async () => {
        await renderHud();
        await type(/^Amount/, "500");
        expect(button("Bet $500.00").disabled).toBe(true);
    });

    it("cancels a bet in the countdown", async () => {
        const { sent } = await renderHud({ results: [{ balance: "100.00" }], lanes: [{ ...lane, myBet }] });
        await click("Cancel");
        expect(sent()[0]?.action).toBe("cancelBet");
        expect(button("Bet $1.00")).toBeTruthy();
    });

    it("shows the live cash-out amount while running and cashes out", async () => {
        const running = { ...lane, phase: "running", startAt: T, multiplier: "1.84", myBet } as const;
        const { sent } = await renderHud({
            results: [{ balance: "101.84", cashout: { multiplier: "1.84", win: "1.84" } }],
            lanes: [running],
        });
        await click("Cash out $1.84");
        expect(sent()[0]?.action).toBe("cashout");
        expect(button("Cashed out $1.84").disabled).toBe(true);
    });

    it("waits for the next round without a bet while running", async () => {
        await renderHud({ lanes: [{ ...lane, phase: "running" }] });
        expect(button("Wait for next round").disabled).toBe(true);
    });

    it("blocks actions and shows a banner while reconnecting", async () => {
        const { status } = await renderHud();
        await status("reconnecting");
        expect(screen.getByRole("status").textContent).toBe("Reconnecting…");
        expect(button("Bet $1.00").disabled).toBe(true);
    });

    it("ALERT: dialog with OK closes it", async () => {
        const running = { ...lane, phase: "running", myBet } as const;
        const alert = new GameApiError(422, { kind: "business", code: 1, level: "ALERT", message: "Too late" });
        await renderHud({ results: [alert], lanes: [running] });
        await click(/^Cash out/);
        expect(screen.getByRole("alertdialog", { name: "Notice" }).textContent).toContain("Too late");
        await click("OK");
        expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("CRITICAL: session over with reload", async () => {
        const critical = new GameApiError(422, { kind: "business", code: 109, level: "CRITICAL", message: "" });
        const { onReload } = await renderHud({ results: [critical], lanes: [{ ...lane, phase: "running", myBet }] });
        await click(/^Cash out/);
        expect(screen.getByRole("alertdialog", { name: "Session over" }).textContent).toContain(
            "Something went wrong."
        );
        await click("Reload");
        expect(onReload).toHaveBeenCalledOnce();
    });

    it("lane games get one slot per lane; live bets can be hidden; top wins show when sent", async () => {
        const { emit } = await renderHud({
            crash: { lanes: 3, liveBets: false, autoCashout: null },
            lanes: [lane, { ...lane, lane: 2 }, { ...lane, lane: 3 }],
        });
        expect(screen.getAllByRole("region", { name: /^Lane \d$/ })).toHaveLength(3);
        expect(screen.queryByRole("region", { name: "Live bets" })).toBeNull();
        expect(screen.queryByLabelText("Auto cash-out at")).toBeNull();

        await emit({ seq: ++seq, serverTime: T, type: "history", history: [], topWins: lane.bets });
        expect(screen.getByRole("region", { name: "Top wins" }).textContent).toContain("alice");
    });
});
