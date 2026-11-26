import type { CrashSession } from "@fep/game-core/crash";
import type { LaneId } from "@fep/protocol/crash";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { Dialog } from "../common/components/dialog";
import { formatMoney } from "../common/utils/money";
import { useCrashHudState } from "../store/use-crash-hud-state";
import { BetList } from "./bet-list";
import { BetSlot } from "./bet-slot";
import styles from "./crash-hud.module.css";

export interface CrashHudProps {
    session: CrashSession;
    /** Session-over action. Default reloads the page. */
    onReload?: () => void;
    locale?: string;
}

const reloadPage = () => window.location.reload();
/** Crash points at or above this are highlighted in the history strip. */
const HIGH_CRASH = 2;

// ponytail: English strings inline; switch to i18n keys when packages/i18n lands.
export function CrashHud({ session, onReload = reloadPage, locale }: CrashHudProps) {
    const { phase, connection, init, balance, error, history, topWins, laneIds } = useCrashHudState(session.store);
    const lanes = laneIds ? (laneIds.split(",").map(Number) as LaneId[]) : [];
    // Live bets of every lane; the arrays keep their identity across ticks, so this re-renders only on bet events.
    const liveBets = useStore(
        session.store,
        useShallow((s) => lanes.map((lane) => s.lanes[lane]?.bets ?? []))
    );

    if (!init || balance === null) {
        return (
            <div className={styles.hud} aria-busy="true">
                Loading…
            </div>
        );
    }

    const money = (amount: string) =>
        formatMoney(amount, { currency: init.money.currency, rounding: init.money.decimals, locale });
    const canAct = phase === "ready" && connection === "live" && error === null;

    return (
        <>
            <div className={styles.hud}>
                <div className={styles.top}>
                    <div className={styles.stat}>
                        <span className={styles.label}>Balance</span>
                        <span>{money(balance)}</span>
                    </div>
                    <ol className={styles.history} aria-label="Recent rounds">
                        {history.map((round) => (
                            <li
                                key={round.roundId}
                                className={Number(round.crashPoint) >= HIGH_CRASH ? styles.high : undefined}
                            >
                                {round.crashPoint}x
                            </li>
                        ))}
                    </ol>
                    {phase === "ready" && connection !== "live" && (
                        <div className={styles.banner} role="status">
                            {connection === "connecting" ? "Connecting…" : "Reconnecting…"}
                        </div>
                    )}
                </div>

                <div className={styles.slots}>
                    {lanes.map((lane) => (
                        <BetSlot key={lane} session={session} lane={lane} init={init} canAct={canAct} money={money} />
                    ))}
                </div>

                <div className={styles.top}>
                    {init.capabilities.crash.liveBets && (
                        <BetList title="Live bets" bets={liveBets.flat()} money={money} />
                    )}
                    {topWins.length > 0 && <BetList title="Top wins" bets={topWins} money={money} />}
                </div>
            </div>

            {error && (
                <Dialog title={phase === "over" ? "Session over" : "Notice"}>
                    <p>{error.message || "Something went wrong."}</p>
                    {phase === "over" ? (
                        <button type="button" onClick={onReload}>
                            Reload
                        </button>
                    ) : (
                        <button type="button" onClick={() => session.dismissError()}>
                            OK
                        </button>
                    )}
                </Dialog>
            )}
        </>
    );
}
