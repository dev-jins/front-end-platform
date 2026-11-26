import type { SlotSession } from "@fep/game-core/slot";
import { useState } from "react";

import { Dialog } from "../common/components/dialog";
import { formatMoney, isZeroMoney, multiplyMoney, percentOf } from "../common/utils/money";
import { useSlotHudState } from "../store/use-slot-hud-state";
import styles from "./slot-hud.module.css";
import { StepDialog } from "./step-dialog";

export interface SlotHudProps<S> {
    session: SlotSession<S>;
    /** Show "Buy bonus". Only for games that sell the feature: /buy on any other game ends the session (102). */
    buyFeature?: boolean;
    /** Session-over action. Default reloads the page: init restores the session from `lastSpin`. */
    onReload?: () => void;
}

const reloadPage = () => window.location.reload();

// ponytail: English strings inline; switch to i18n keys when packages/i18n lands.
export function SlotHud<S>({ session, buyFeature = false, onReload = reloadPage }: SlotHudProps<S>) {
    const { phase, init, balance, win, mode, nextStep, jackpotState, error, startPopup, winnerPopup } = useSlotHudState(
        session.store
    );
    const [betIndex, setBetIndex] = useState(0);

    if (!init || balance === null) {
        return (
            <div className={styles.hud} aria-busy="true">
                Loading…
            </div>
        );
    }

    const money = (amount: string) =>
        formatMoney(amount, {
            currency: init.currencyData.currency,
            rounding: init.currencyData.rounding,
            locale: init.locale,
        });
    const bets = init.bets;
    const index = Math.min(betIndex, bets.length - 1);
    const bet = bets[index] ?? "0";
    const totalBet = init.lines ? multiplyMoney(bet, init.lines) : bet;
    const canPlay = phase === "idle" && error === null && nextStep === "spin";

    return (
        <>
            <div className={styles.hud}>
                <div className={styles.stat}>
                    <span className={styles.label}>Balance</span>
                    <span>{money(balance)}</span>
                </div>

                <div className={styles.stat} aria-live="polite">
                    <span className={styles.label}>{mode === "freespin" ? "Free spins · Win" : "Win"}</span>
                    <span>{win && !isZeroMoney(win) ? money(win) : "—"}</span>
                </div>

                <div className={styles.bet}>
                    <button
                        type="button"
                        aria-label="Decrease bet"
                        disabled={!canPlay || index === 0}
                        onClick={() => setBetIndex(index - 1)}
                    >
                        −
                    </button>
                    <div className={styles.stat}>
                        <span className={styles.label}>Total bet</span>
                        <span>{money(totalBet)}</span>
                    </div>
                    <button
                        type="button"
                        aria-label="Increase bet"
                        disabled={!canPlay || index === bets.length - 1}
                        onClick={() => setBetIndex(index + 1)}
                    >
                        +
                    </button>
                </div>

                <button
                    type="button"
                    className={styles.spin}
                    disabled={!canPlay}
                    onClick={() => void session.spin(bet)}
                >
                    Spin
                </button>

                {buyFeature && (
                    <button
                        type="button"
                        className={styles.buy}
                        disabled={!canPlay || mode !== "spin"}
                        onClick={() => void session.buy(bet)}
                    >
                        Buy bonus {money(percentOf(totalBet, init.bonusCoefficient))}
                    </button>
                )}
            </div>

            {error ? (
                <Dialog title={phase === "over" ? "Session over" : "Notice"}>
                    <p>{error.message || "Something went wrong."}</p>
                    {phase === "over" ? (
                        <button type="button" onClick={onReload}>
                            Reload
                        </button>
                    ) : (
                        <button type="button" onClick={() => void session.dismissError()}>
                            OK
                        </button>
                    )}
                </Dialog>
            ) : startPopup ? (
                <Dialog title={startPopup.name}>
                    <p>{startPopup.description}</p>
                    <p>
                        Prize pool{" "}
                        {formatMoney(startPopup.totalPrizeAmount, {
                            currency: startPopup.currency,
                            rounding: 2,
                            locale: init.locale,
                        })}
                    </p>
                    <button type="button" onClick={() => session.dismissPopup("start")}>
                        OK
                    </button>
                </Dialog>
            ) : winnerPopup ? (
                <Dialog title={winnerPopup.name}>
                    <p>
                        You placed #{winnerPopup.place} and won{" "}
                        {formatMoney(winnerPopup.prizeAmount, {
                            currency: winnerPopup.currency,
                            rounding: 2,
                            locale: init.locale,
                        })}
                    </p>
                    <button type="button" onClick={() => session.dismissPopup("winner")}>
                        OK
                    </button>
                </Dialog>
            ) : (
                <StepDialog
                    session={session}
                    init={init}
                    nextStep={nextStep}
                    jackpotState={jackpotState}
                    canAct={phase === "idle"}
                />
            )}
        </>
    );
}
