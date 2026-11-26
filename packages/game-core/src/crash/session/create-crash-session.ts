import type { CrashCommand, CrashCommandResult, CrashEvent, LaneId } from "@fep/protocol/crash";

import { createCrashStore } from "../../store/create-crash-store";
import type { CrashLaneState } from "../../store/types/crash-lane-state.type";
import { applyCrashEvent } from "../reducers/apply-crash-event";
import type { CrashSession } from "../types/crash-session.type";
import type { CrashSessionOptions } from "../types/crash-session-options.type";
import { isAllowedBet } from "../utils/is-allowed-bet";
import { toCrashSessionError } from "../utils/to-crash-session-error";

export function createCrashSession({
    transport,
    onWarning = console.warn,
    onStreamError = console.warn,
    createRequestId = () => crypto.randomUUID(),
    now = Date.now,
    // ponytail: a timer, not requestAnimationFrame, so the queue keeps draining in a hidden tab (rAF stops there).
    scheduleFlush = (flush) => void setTimeout(flush, 16),
}: CrashSessionOptions): CrashSession {
    const store = createCrashStore();
    const { getState: get, setState: set } = store;

    let started = false;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    /** Events with their arrival time, applied in one store update so the HUD renders once per burst. */
    let queue: [CrashEvent, number][] = [];

    function flush() {
        const events = queue;
        queue = [];
        if (stopped || events.length === 0) return;
        set((state) => events.reduce((s, [event, receivedAt]) => applyCrashEvent(s, event, receivedAt), state));
    }

    function fail(error: unknown) {
        const sessionError = toCrashSessionError(error);
        if (sessionError.level === "WARNING") onWarning(sessionError);
        else if (sessionError.level === "CRITICAL") set({ phase: "over", error: sessionError });
        else set({ error: sessionError });
    }

    function patchLane(lane: LaneId, patch: (current: CrashLaneState) => Partial<CrashLaneState>) {
        set((state) => {
            const current = state.lanes[lane];
            return current ? { lanes: { ...state.lanes, [lane]: { ...current, ...patch(current) } } } : {};
        });
    }

    /** Lane usable for a new command: session ready, stream live, no open error, nothing in flight on it. */
    function readyLane(lane: LaneId): CrashLaneState | undefined {
        const { phase, connection, error, lanes } = get();
        const current = lanes[lane];
        if (phase !== "ready" || connection !== "live" || error !== null || !current || current.pending) return;
        return current;
    }

    async function send(
        command: CrashCommand,
        apply: (result: CrashCommandResult) => Partial<CrashLaneState>
    ): Promise<boolean> {
        patchLane(command.lane, () => ({ pending: command.action }));
        try {
            const result = await transport.play(command);
            set({ balance: result.balance });
            patchLane(command.lane, () => ({ ...apply(result), pending: null }));
        } catch (error) {
            patchLane(command.lane, () => ({ pending: null }));
            fail(error);
        }
        return true;
    }

    return {
        store,

        async start() {
            if (started) return;
            started = true;
            try {
                const init = await transport.init();
                if (stopped) return;
                set({ phase: "ready", init, balance: init.money.balance });
            } catch (error) {
                set({ phase: "over", error: { ...toCrashSessionError(error), level: "CRITICAL" } });
                return;
            }
            unsubscribe = transport.subscribe({
                onEvent(event) {
                    if (queue.length === 0) scheduleFlush(flush);
                    queue.push([event, now()]);
                },
                onStatus(connection) {
                    set({ connection });
                    if (connection === "offline") {
                        set({ phase: "over", error: { code: null, level: "CRITICAL", message: "Connection refused" } });
                    }
                },
                onError: onStreamError,
            });
        },

        bet(lane, amount, autoCashout) {
            const current = readyLane(lane);
            const init = get().init;
            const nextRound = init?.capabilities.crash.betWhileRunning === "nextRound";
            const open = current?.phase === "countdown" || (nextRound && current?.phase !== undefined);
            if (!current || !init || !open || current.myBet || !isAllowedBet(init, amount, autoCashout)) {
                return Promise.resolve(false);
            }
            const command: CrashCommand = { requestId: createRequestId(), action: "bet", lane, bet: amount };
            if (autoCashout !== undefined) command.autoCashout = autoCashout;
            return send(command, (result) => (result.bet ? { myBet: result.bet } : {}));
        },

        cancelBet(lane) {
            const current = readyLane(lane);
            if (current?.phase !== "countdown" || !current.myBet) return Promise.resolve(false);
            return send({ requestId: createRequestId(), action: "cancelBet", lane }, () => ({ myBet: null }));
        },

        cashout(lane) {
            const current = readyLane(lane);
            const bet = current?.myBet;
            if (current?.phase !== "running" || !bet || bet.cashout || bet.roundId !== current.roundId) {
                return Promise.resolve(false);
            }
            return send({ requestId: createRequestId(), action: "cashout", lane }, (result) => {
                const myBet = get().lanes[lane]?.myBet;
                return result.cashout && myBet ? { myBet: { ...myBet, cashout: result.cashout } } : {};
            });
        },

        dismissError() {
            if (get().phase !== "over") set({ error: null });
        },

        stop() {
            stopped = true;
            queue = [];
            unsubscribe?.();
        },
    };
}
