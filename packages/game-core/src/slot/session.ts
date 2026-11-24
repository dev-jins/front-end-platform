import type { TournamentStartPopup, TournamentWinnerPopup } from "@fep/protocol";
import {
    type ActionWrapper,
    actionWrapperSchema,
    type ExternalFreespins,
    type InitResponse,
    type SlotActionBodies,
    type SlotTransport,
    type Step,
} from "@fep/protocol/slot";
import { createStore, type StoreApi } from "zustand/vanilla";

import { type SessionError, toSessionError } from "../common/session-error.js";
import type { Round, StateAdapter } from "./adapter.js";

/**
 * loading → idle ⇄ requesting → presenting → idle … ; over = session cannot continue (CRITICAL).
 * Controls are enabled only in `idle`.
 */
export type SlotPhase = "loading" | "idle" | "requesting" | "presenting" | "over";

export interface SlotState<S> {
    phase: SlotPhase;
    /** Game config from init: slot, bets, lines, currencyData, bonusParameters, … */
    init: InitResponse | null;
    /** What the screen shows. Only updated after the renderer has presented a round. */
    displayed: Round<S> | null;
    /** Balance matching `displayed`, not the server's latest. */
    balance: string | null;
    /** Server result being presented; null otherwise. */
    pending: Round<S> | null;
    externalFreespins: ExternalFreespins | null;
    /** One-shot popups: kept until dismissed, never overwritten by a later null. */
    tournamentStartPopup: TournamentStartPopup | null;
    tournamentWinnerPopup: TournamentWinnerPopup | null;
    error: SessionError | null;
}

export interface SlotSessionOptions<S> {
    sessionKey: string;
    /** Also used for operator freespins handoff (`externalFreespins.nextSessionKey`). */
    createTransport(sessionKey: string): SlotTransport;
    adapter: StateAdapter<S>;
    /** Plays a round on screen; resolves when reels have landed. Default resolves at once. */
    present?(round: Round<S>): Promise<void>;
    /** WARNING level errors (e.g. 300 language fallback). Default: console.warn. */
    onWarning?(error: SessionError): void;
}

export interface SlotSession<S> {
    store: StoreApi<SlotState<S>>;
    /** Calls game init — once per game start; later calls are ignored. Resumes auto steps after a reload. */
    start(): Promise<void>;
    /** Tells the API that assets are loaded (`POST /stat/loaded`). */
    loaded(): Promise<void>;
    // Intents resolve false (and send nothing) when not allowed now: wrong phase/step or a value the API would reject.
    spin(bet: string, lines?: number): Promise<boolean>;
    buy(bet: string): Promise<boolean>;
    /** Pick a bonus branch, a key of `init.bonusParameters`. */
    bonus(variant: string): Promise<boolean>;
    /** Open a jackpot field cell, 1-based. */
    openFieldItem(col: number, row: number): Promise<boolean>;
    /** Continue a user-gated step without input: `jackpot`, `getPreviousState`. */
    next(): Promise<boolean>;
    /** Close the error dialog; resumes auto steps interrupted by an ALERT (retry). */
    dismissError(): Promise<void>;
    dismissPopup(popup: "start" | "winner"): void;
}

/** Steps game-core calls by itself after the previous round is presented. */
const AUTO_STEPS = ["freespin", "respin", "avalanche"] as const;
type AutoStep = (typeof AUTO_STEPS)[number];
const isAutoStep = (step: Step | undefined): step is AutoStep => AUTO_STEPS.includes(step as AutoStep);

type ActionBody<E extends keyof SlotActionBodies> = Omit<SlotActionBodies[E], "fingerprint">;

const initialState: SlotState<never> = {
    phase: "loading",
    init: null,
    displayed: null,
    balance: null,
    pending: null,
    externalFreespins: null,
    tournamentStartPopup: null,
    tournamentWinnerPopup: null,
    error: null,
};

export function createSlotSession<S>(options: SlotSessionOptions<S>): SlotSession<S> {
    const { adapter, createTransport, present = async () => undefined, onWarning = console.warn } = options;
    const store = createStore<SlotState<S>>()(() => initialState);
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
