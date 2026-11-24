import { type ActionWrapper, actionWrapperSchema, type SlotActionBodies, type Step } from "@fep/protocol/slot";

import type { SessionError } from "../../common/types/session-error.type";
import { toSessionError } from "../../common/utils/to-session-error";
import { createSlotStore } from "../../store/create-slot-store";
import type { ActionBody } from "../types/action-body.type";
import type { SlotSession } from "../types/slot-session.type";
import type { SlotSessionOptions } from "../types/slot-session-options.type";
import { isAutoStep } from "../utils/is-auto-step";

export function createSlotSession<S>(options: SlotSessionOptions<S>): SlotSession<S> {
    const { adapter, createTransport, present = async () => undefined, onWarning = console.warn } = options;
    const store = createSlotStore<S>();
    const { getState: get, setState: set } = store;

    let transport = createTransport(options.sessionKey);
    // Rotated by every init; kept out of the store so UI code can't touch it.
    let fingerprint = "";
    let started = false;

    function fail(error: unknown): void {
        const sessionError = toSessionError(error);
        if (sessionError.level === "WARNING") {
            onWarning(sessionError);
            set({ phase: "idle", pending: null });
            return;
        }
        set({ phase: sessionError.level === "CRITICAL" ? "over" : "idle", pending: null, error: sessionError });
    }

    /** Returns false when init reported a CRITICAL error. */
    async function init(): Promise<boolean> {
        set({ phase: "loading" });
        const response = await transport.init();
        fingerprint = response.fingerprint;
        const { tournamentStartPopup, tournamentWinnerPopup } = get();
        set({
            init: response,
            displayed: adapter.parse(response.lastSpin),
            balance: response.balance.amount,
            externalFreespins: response.externalFreespins,
            tournamentStartPopup: response.tournamentStartPopup ?? tournamentStartPopup,
            tournamentWinnerPopup: response.tournamentWinnerPopup ?? tournamentWinnerPopup,
        });

        if (response.errorCode !== undefined) {
            const error: SessionError = {
                code: response.errorCode,
                level: response.errorLevel ?? "CRITICAL",
                message: response.errorMessage ?? "",
            };
            if (error.level === "WARNING") onWarning(error);
            else if (error.level === "CRITICAL") {
                set({ phase: "over", error });
                return false;
            } else set({ error });
        }
        set({ phase: "idle" });
        return true;
    }

    /** Request → present → commit. Server truth reaches `displayed` / `balance` only after the reels land. */
    async function play<E extends keyof SlotActionBodies>(endpoint: E, body: ActionBody<E>): Promise<ActionWrapper> {
        set({ phase: "requesting", error: null });
        const raw = await transport.action(endpoint, { ...body, fingerprint } as SlotActionBodies[E]);
        const wrapper = actionWrapperSchema.parse(raw);
        const round = adapter.parse(raw);

        set({ phase: "presenting", pending: round });
        await present(round);

        const { tournamentStartPopup, tournamentWinnerPopup } = get();
        set({
            phase: "idle",
            pending: null,
            displayed: round,
            balance: wrapper.balance.amount,
            externalFreespins: wrapper.externalFreespins ?? null,
            tournamentStartPopup: wrapper.tournamentStartPopup ?? tournamentStartPopup,
            tournamentWinnerPopup: wrapper.tournamentWinnerPopup ?? tournamentWinnerPopup,
        });
        return wrapper;
    }

    /** Runs an action, then keeps following `nextStep` while it is an auto step. */
    async function run(action: (() => Promise<ActionWrapper>) | null): Promise<void> {
        try {
            for (;;) {
                if (action) {
                    const nextSessionKey = (await action()).externalFreespins?.nextSessionKey;
                    if (nextSessionKey) {
                        // Operator freespins ended: this session is closed, continue on the new one.
                        transport = createTransport(nextSessionKey);
                        if (!(await init())) return;
                    }
                }
                const step = get().displayed?.nextStep;
                if (!isAutoStep(step)) return;
                action = () => play(step, {});
            }
        } catch (error) {
            fail(error);
        }
    }

    /** Idle, no open error dialog, and the server expects one of `steps` next. */
    function canPlay(...steps: Step[]): boolean {
        const { phase, error, displayed } = get();
        return phase === "idle" && error === null && displayed !== null && steps.includes(displayed.nextStep);
    }

    async function intent(allowed: boolean, action: () => Promise<ActionWrapper>): Promise<boolean> {
        if (!allowed) return false;
        await run(action);
        return true;
    }

    const isBet = (bet: string) => get().init?.bets.includes(bet) ?? false;

    return {
        store,

        async start() {
            if (started) return;
            started = true;
            try {
                if (!(await init())) return;
            } catch (error) {
                fail(error);
                return;
            }
            await run(null);
        },

        async loaded() {
            // Telemetry must never break the game.
            await transport.stat("loaded").catch(() => undefined);
        },

        spin(bet, lines = get().init?.lines ?? undefined) {
            return intent(canPlay("spin") && isBet(bet) && Number.isInteger(lines), () =>
                play("spin", { bet, lines: lines as number })
            );
        },

        buy(bet) {
            return intent(canPlay("spin") && isBet(bet), () => play("buy", { bet }));
        },

        bonus(variant) {
            const variants = get().init?.bonusParameters ?? {};
            return intent(canPlay("bonus") && variant in variants, () => play("bonus", { variant }));
        },

        openFieldItem(col, row) {
            const valid = Number.isInteger(col) && Number.isInteger(row) && col > 0 && row > 0;
            return intent(canPlay("jackpot") && valid, () => play("open-field-item", { col, row }));
        },

        next() {
            const step = get().displayed?.nextStep;
            if (step !== "jackpot" && step !== "getPreviousState") return Promise.resolve(false);
            return intent(canPlay(step), () => play(step, {}));
        },

        async dismissError() {
            if (get().phase === "over") return;
            set({ error: null });
            if (get().phase === "idle") await run(null);
        },

        dismissPopup(popup) {
            set(popup === "start" ? { tournamentStartPopup: null } : { tournamentWinnerPopup: null });
        },
    };
}
