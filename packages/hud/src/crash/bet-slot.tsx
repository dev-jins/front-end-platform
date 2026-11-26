import { type CrashSession, isAllowedBet } from "@fep/game-core/crash";
import type { CrashInit, LaneId } from "@fep/protocol/crash";
import { useState } from "react";
import { useStore } from "zustand";

import { multiplyByDecimal } from "../common/utils/money";
import styles from "./crash-hud.module.css";

export interface BetSlotProps {
    session: CrashSession;
    lane: LaneId;
    init: CrashInit;
    /** Session ready, stream live, no error open. */
    canAct: boolean;
    money(amount: string): string;
}

/** One lane's bet: amount, optional auto cash-out, and the one button whose action follows the round. */
export function BetSlot({ session, lane, init, canAct, money }: BetSlotProps) {
    const state = useStore(session.store, (s) => s.lanes[lane]);
    const [amount, setAmount] = useState(init.bets.default);
    const autoRule = init.capabilities.crash.autoCashout;
    const [autoOn, setAutoOn] = useState(false);
    const [autoAt, setAutoAt] = useState("2.00");
    if (!state) return null;

    const { phase, myBet, pending } = state;
    const autoCashout = autoRule && autoOn ? autoAt : undefined;
    const betThisRound = myBet !== null && myBet.roundId === state.roundId;
    const nextRound = init.capabilities.crash.betWhileRunning === "nextRound";
    const label = lane === 1 && init.capabilities.crash.lanes === 1 ? "Bet" : `Lane ${lane}`;

    let button: { text: string; className?: string; enabled: boolean; onClick?: () => unknown };
    if (pending) {
        button = { text: "Sending…", enabled: false };
    } else if (myBet?.cashout) {
        button = { text: `Cashed out ${money(myBet.cashout.win)}`, enabled: false };
    } else if (myBet && phase === "countdown") {
        button = { text: "Cancel", className: styles.cancel, enabled: canAct, onClick: () => session.cancelBet(lane) };
    } else if (myBet && betThisRound && phase === "running") {
        button = {
            text: `Cash out ${money(multiplyByDecimal(myBet.amount, state.multiplier))}`,
            className: styles.cashout,
            enabled: canAct,
            onClick: () => session.cashout(lane),
        };
    } else if (myBet) {
        button = { text: "Waiting for round", enabled: false };
    } else {
        const open = phase === "countdown" || nextRound;
        button = {
            text: open ? `Bet ${money(amount)}` : "Wait for next round",
            enabled: canAct && open && isAllowedBet(init, amount, autoCashout),
            onClick: () => session.bet(lane, amount, autoCashout),
        };
    }
    const editable = canAct && myBet === null && !pending;

    return (
        <section className={styles.slot} aria-label={label}>
            <label>
                Amount ({money(init.bets.min)} – {money(init.bets.max)})
                <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    disabled={!editable}
                    onChange={(event) => setAmount(event.target.value.trim())}
                />
            </label>
            {autoRule && (
                <div className={styles.check}>
                    <input
                        id={`auto-${lane}`}
                        type="checkbox"
                        checked={autoOn}
                        disabled={!editable}
                        onChange={(event) => setAutoOn(event.target.checked)}
                    />
                    <label htmlFor={`auto-${lane}`}>Auto cash-out at</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Auto cash-out multiplier"
                        value={autoAt}
                        disabled={!editable || !autoOn}
                        onChange={(event) => setAutoAt(event.target.value.trim())}
                    />
                    x
                </div>
            )}
            <button
                type="button"
                className={button.className}
                disabled={!button.enabled}
                onClick={() => void button.onClick?.()}
            >
                {button.text}
            </button>
        </section>
    );
}
