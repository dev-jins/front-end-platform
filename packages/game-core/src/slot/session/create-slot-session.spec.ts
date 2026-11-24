import { GameApiError } from "@fep/protocol";
import { type GameState, initResponseSchema, type SlotTransport } from "@fep/protocol/slot";
import { docExamples } from "@fep/protocol/testing";
import type { SlotState } from "../../store/types/slot-state.type";
import { standardStateAdapter } from "../adapters/standard-state-adapter";
import type { Round } from "../types/round.type";
import { createSlotSession } from "./create-slot-session";

type Raw = Record<string, unknown>;

const [initExample] = docExamples("Game init request") as [Raw];
const [, spinExample] = docExamples("Spin request") as [unknown, Raw];
const [freespinExample] = docExamples("Game state") as [Raw];

const BET = "10";

const initResponse = (overrides: Raw = {}): Raw => ({ ...structuredClone(initExample), ...overrides });
const spinResult = (overrides: Raw = {}): Raw => ({ ...structuredClone(spinExample), ...overrides });
const freespinResult = (overrides: Raw = {}): Raw => ({ ...structuredClone(freespinExample), ...overrides });
const withBalance = (amount: string) => ({
    balance: { sessionKey: "k", currency: "USD", amount },
});
const businessError = (code: number, level: string, message = "error") =>
    new GameApiError(422, { kind: "business", code, level: level as "ALERT", message });

/** Transport stub: `init` answers from `inits`, actions answer from `actions` in order (Error = rejection). */
function fakeTransport(inits: unknown[], actions: unknown[] = []) {
    const next = (queue: unknown[]) => {
        const value = queue.shift();
        return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    };
    return {
        // Same as the real transport: init is parsed (bets become strings), actions stay raw.
        init: vi.fn<SlotTransport["init"]>(() => next(inits).then((raw) => initResponseSchema.parse(raw))),
        action: vi.fn<SlotTransport["action"]>(() => next(actions)),
        tournaments: vi.fn<SlotTransport["tournaments"]>(),
        stat: vi.fn<SlotTransport["stat"]>(async () => undefined),
    };
}

function setup(
    transport = fakeTransport([initResponse()]),
    extra: { present?: (r: Round<GameState>) => Promise<void> } = {}
) {
    const transports: Record<string, ReturnType<typeof fakeTransport>> = { start: transport };
    const createTransport = vi.fn((key: string) => transports[key] ?? transport);
    const onWarning = vi.fn();
    const session = createSlotSession({
        sessionKey: "start",
        createTransport,
        adapter: standardStateAdapter,
        onWarning,
        ...extra,
    });
    const state = (): SlotState<GameState> => session.store.getState();
    return { session, state, transport, transports, createTransport, onWarning };
}

describe("start", () => {
    it("calls init once, restores the screen from lastSpin and goes idle", async () => {
        const { session, state, transport } = setup();
        await session.start();
        await session.start();

        expect(transport.init).toHaveBeenCalledOnce();
        expect(state()).toMatchObject({ phase: "idle", balance: "10300", error: null });
        expect(state().displayed?.nextStep).toBe("spin");
        expect(state().tournamentStartPopup?.tournamentId).toBe(7);
    });

    it("resumes auto steps after a reload into a freespin series", async () => {
        const lastSpin = { ...freespinResult(), balance: undefined };
        const transport = fakeTransport(
            [initResponse({ lastSpin, mode: "freespin" })],
            [spinResult(withBalance("10800"))]
        );
        const { session, state } = setup(transport);
        await session.start();

        expect(transport.action).toHaveBeenCalledWith("freespin", { fingerprint: initExample.fingerprint });
        expect(state()).toMatchObject({ phase: "idle", balance: "10800" });
    });

    it("logs a WARNING reported by init and continues", async () => {
        const { session, state, onWarning } = setup(
            fakeTransport([
                initResponse({ errorCode: 300, errorLevel: "WARNING", errorMessage: "This language is not supported" }),
            ])
        );
        await session.start();
        expect(onWarning).toHaveBeenCalledWith({
            code: 300,
            level: "WARNING",
            message: "This language is not supported",
        });
        expect(state()).toMatchObject({ phase: "idle", error: null });
    });

    it("ends the session on a CRITICAL error reported by init", async () => {
        const { session, state } = setup(
            fakeTransport([initResponse({ errorCode: 111, errorLevel: "CRITICAL", errorMessage: "Geo" })])
        );
        await session.start();
        expect(state()).toMatchObject({ phase: "over", error: { code: 111, level: "CRITICAL" } });
        expect(await session.spin(BET)).toBe(false);
    });

    it("shows an ALERT reported by init as a dialog", async () => {
        const { session, state } = setup(fakeTransport([initResponse({ errorCode: 3, errorLevel: "ALERT" })]));
        await session.start();
        expect(state()).toMatchObject({ phase: "idle", error: { code: 3, level: "ALERT", message: "" } });
    });

    it("ends the session when init fails", async () => {
        const { session, state } = setup(fakeTransport([new TypeError("Failed to fetch")]));
        await session.start();
        expect(state()).toMatchObject({
            phase: "over",
            error: { code: null, level: "CRITICAL", message: "Failed to fetch" },
        });
    });
});

describe("spin", () => {
    it("presents the result before committing balance and win", async () => {
        const seen: Partial<SlotState<GameState>>[] = [];
        const transport = fakeTransport([initResponse()], [spinResult()]);
        const { session, state } = setup(transport, {
            present: async (round) => {
                const { phase, balance, displayed, pending } = state();
                seen.push({ phase, balance, displayed, pending });
                expect(round.totalWin).toBe("50");
            },
        });
        await session.start();

        expect(await session.spin(BET)).toBe(true);
        expect(transport.action).toHaveBeenCalledWith("spin", {
            bet: BET,
            lines: 10,
            fingerprint: initExample.fingerprint,
        });
        // While the reels spin, the screen still shows the previous round and balance.
        expect(seen[0]).toMatchObject({ phase: "presenting", balance: "10300", pending: { totalWin: "50" } });
        expect(seen[0]?.displayed?.totalWin).toBe("0");
        expect(state()).toMatchObject({
            phase: "idle",
            balance: "10250",
            pending: null,
            displayed: { totalWin: "50" },
        });
    });

    it("locks controls while a request is in flight", async () => {
        let release: () => void = () => undefined;
        const { session } = setup(fakeTransport([initResponse()], [spinResult()]), {
            present: () => new Promise<void>((resolve) => (release = resolve)),
        });
        await session.start();
        const first = session.spin(BET);
        await vi.waitFor(() => expect(session.store.getState().phase).toBe("presenting"));
        expect(await session.spin(BET)).toBe(false);
        release();
        await first;
    });

    it("refuses values the API would reject, without calling it", async () => {
        const { session, transport } = setup(fakeTransport([initResponse({ lines: null })]));
        await session.start();
        expect(await session.spin("7")).toBe(false);
        expect(await session.spin(BET)).toBe(false);
        expect(await session.spin(BET, 1.5)).toBe(false);
        expect(transport.action).not.toHaveBeenCalled();
    });

    it("follows auto steps until the server wants a spin again", async () => {
        const transport = fakeTransport(
            [initResponse()],
            [freespinResult(), freespinResult({ nextStep: "freespin" }), spinResult(withBalance("11000"))]
        );
        const { session, state } = setup(transport);
        await session.start();
        await session.spin(BET);

        expect(transport.action.mock.calls.map(([endpoint]) => endpoint)).toEqual(["spin", "freespin", "freespin"]);
        expect(state()).toMatchObject({ phase: "idle", balance: "11000", displayed: { nextStep: "spin" } });
    });
});

describe("errors", () => {
    it("ALERT: keeps the last displayed state and allows retry", async () => {
        const transport = fakeTransport(
            [initResponse()],
            [businessError(3, "ALERT", "Not enough money"), spinResult()]
        );
        const { session, state } = setup(transport);
        await session.start();
        await session.spin(BET);

        expect(state()).toMatchObject({ phase: "idle", balance: "10300", pending: null, error: { code: 3 } });
        expect(await session.spin(BET)).toBe(false); // dialog open
        await session.dismissError();
        expect(await session.spin(BET)).toBe(true);
        expect(state().balance).toBe("10250");
    });

    it("ALERT during auto steps: dismissing the dialog resumes them", async () => {
        const transport = fakeTransport(
            [initResponse()],
            [freespinResult(), businessError(112, "ALERT"), spinResult(withBalance("10900"))]
        );
        const { session, state } = setup(transport);
        await session.start();
        await session.spin(BET);
        expect(state()).toMatchObject({ phase: "idle", error: { code: 112 }, displayed: { nextStep: "freespin" } });

        await session.dismissError();
        expect(state()).toMatchObject({ phase: "idle", error: null, balance: "10900" });
    });

    it("CRITICAL: ends the session", async () => {
        const { session, state } = setup(
            fakeTransport([initResponse()], [businessError(109, "CRITICAL", "Session is closed")])
        );
        await session.start();
        await session.spin(BET);
        expect(state()).toMatchObject({ phase: "over", error: { code: 109 } });
        await session.dismissError();
        expect(state().phase).toBe("over");
    });

    it("WARNING: logged, the session continues", async () => {
        const { session, state, onWarning } = setup(fakeTransport([initResponse()], [businessError(300, "WARNING")]));
        await session.start();
        await session.spin(BET);
        expect(onWarning).toHaveBeenCalledOnce();
        expect(state()).toMatchObject({ phase: "idle", error: null });
    });

    it("an invalid response ends the session", async () => {
        const { session, state } = setup(fakeTransport([initResponse()], [{ nonsense: true }]));
        await session.start();
        await session.spin(BET);
        expect(state()).toMatchObject({ phase: "over", error: { code: null, level: "CRITICAL" } });
    });
});

describe("other intents", () => {
    it("buy: sends the bet without lines", async () => {
        const transport = fakeTransport([initResponse()], [spinResult()]);
        const { session } = setup(transport);
        await session.start();
        expect(await session.buy("1")).toBe(false);
        expect(await session.buy(BET)).toBe(true);
        expect(transport.action).toHaveBeenCalledWith("buy", { bet: BET, fingerprint: initExample.fingerprint });
    });

    it("bonus: only a variant from bonusParameters, only when the server asks for it", async () => {
        const transport = fakeTransport([initResponse()], [spinResult({ nextStep: "bonus" }), spinResult()]);
        const { session } = setup(transport);
        await session.start();
        expect(await session.bonus("2")).toBe(false);
        await session.spin(BET);
        expect(await session.bonus("9")).toBe(false);
        expect(await session.bonus("2")).toBe(true);
        expect(transport.action).toHaveBeenLastCalledWith("bonus", {
            variant: "2",
            fingerprint: initExample.fingerprint,
        });
    });

    it("jackpot: openFieldItem with 1-based cells, next() for a plain step", async () => {
        const transport = fakeTransport(
            [initResponse()],
            [spinResult({ nextStep: "jackpot" }), spinResult({ nextStep: "jackpot" }), spinResult()]
        );
        const { session } = setup(transport);
        await session.start();
        expect(await session.next()).toBe(false);
        await session.spin(BET);
        expect(await session.openFieldItem(0, 1)).toBe(false);
        expect(await session.openFieldItem(2, 3)).toBe(true);
        expect(await session.next()).toBe(true);
        expect(transport.action.mock.calls.map(([endpoint]) => endpoint)).toEqual([
            "spin",
            "open-field-item",
            "jackpot",
        ]);
    });

    it("dismissPopup clears a one-shot popup; later nulls don't", async () => {
        const { session, state } = setup(fakeTransport([initResponse()], [spinResult()]));
        await session.start();
        await session.spin(BET);
        expect(state().tournamentStartPopup).not.toBeNull();
        session.dismissPopup("start");
        session.dismissPopup("winner");
        expect(state().tournamentStartPopup).toBeNull();
    });

    it("loaded: reports the event and never throws", async () => {
        const { session, transport } = setup();
        transport.stat.mockRejectedValueOnce(new Error("offline"));
        await expect(session.loaded()).resolves.toBeUndefined();
        expect(transport.stat).toHaveBeenCalledWith("loaded");
    });
});

describe("operator freespins handoff", () => {
    it("continues on the next session key with a fresh init", async () => {
        const last = spinResult({
            externalFreespins: {
                total: 10,
                current: 0,
                bet: "1",
                totalWin: "20",
                isLast: true,
                nextSessionKey: "next",
            },
        });
        const first = fakeTransport([initResponse()], [last]);
        const { session, state, transports, createTransport } = setup(first);
        transports.next = fakeTransport([initResponse({ fingerprint: "F2", ...withBalance("12000") })], [spinResult()]);
        await session.start();
        await session.spin(BET);

        expect(createTransport).toHaveBeenLastCalledWith("next");
        expect(state()).toMatchObject({ phase: "idle", balance: "12000" });

        await session.spin(BET);
        expect(transports.next.action).toHaveBeenCalledWith("spin", { bet: BET, lines: 10, fingerprint: "F2" });
    });

    it("stops when the new session cannot start", async () => {
        const last = spinResult({
            externalFreespins: {
                total: 10,
                current: 0,
                bet: "1",
                totalWin: "20",
                isLast: true,
                nextSessionKey: "next",
            },
        });
        const { session, state, transports } = setup(fakeTransport([initResponse()], [last]));
        transports.next = fakeTransport([initResponse({ errorCode: 109, errorLevel: "CRITICAL" })]);
        await session.start();
        await session.spin(BET);
        expect(state()).toMatchObject({ phase: "over", error: { code: 109 } });
    });
});
