import type { SlotSession } from "@fep/game-core/slot";
import type { InitResponse } from "@fep/protocol/slot";

import { Dialog } from "../common/components/dialog";
import type { SlotHudState } from "../store/types/slot-hud-state.type";
import styles from "./slot-hud.module.css";

export interface StepDialogProps<S> {
    session: SlotSession<S>;
    init: InitResponse;
    nextStep: SlotHudState<S>["nextStep"];
    jackpotState: SlotHudState<S>["jackpotState"];
    /** Idle and no error: a choice can be sent now. */
    canAct: boolean;
}

/**
 * The steps that wait for the player: pick a bonus branch, open jackpot cells or continue the jackpot, leave the
 * bonus game. Null on any other step. Stays open while the request runs (buttons disabled) and closes once the
 * session commits a round with another `nextStep`.
 */
// ponytail: plain buttons; per-game bonus/jackpot screens (Pixi or art) replace this when a game ships them.
export function StepDialog<S>({ session, init, nextStep, jackpotState, canAct }: StepDialogProps<S>) {
    if (nextStep === "bonus") {
        const variants = Object.entries(init.bonusParameters ?? {});
        return (
            <Dialog title="Choose your bonus">
                {variants.map(([variant, { freespins, multiplier }]) => (
                    <button key={variant} type="button" disabled={!canAct} onClick={() => void session.bonus(variant)}>
                        {freespins} free spins ×{multiplier}
                    </button>
                ))}
            </Dialog>
        );
    }

    if (nextStep === "getPreviousState") {
        return (
            <Dialog title="Bonus complete">
                <button type="button" disabled={!canAct} onClick={() => void session.next()}>
                    Continue
                </button>
            </Dialog>
        );
    }

    if (nextStep !== "jackpot") return null;

    if (!jackpotState || jackpotState.isCompleted) {
        return (
            <Dialog title="Jackpot">
                {jackpotState?.winItemType && <p>Matched {jackpotState.winItemType}</p>}
                <button type="button" disabled={!canAct} onClick={() => void session.next()}>
                    Continue
                </button>
            </Dialog>
        );
    }

    const { cols, rows, items } = jackpotState.field;
    const cells = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({ col: c + 1, row: r + 1 }))
    ).flat();
    return (
        <Dialog title="Jackpot">
            <p>Open cells until three match</p>
            <div className={styles.field} style={{ gridTemplateColumns: `repeat(${cols}, 48px)` }}>
                {cells.map(({ col, row }) => {
                    const opened = items.find((item) => item.col === col && item.row === row);
                    return (
                        <button
                            key={`${col}-${row}`}
                            type="button"
                            className={opened ? `${styles.cell} ${styles.opened}` : styles.cell}
                            aria-label={opened ? `Cell ${col}, ${row}: ${opened.item}` : `Open cell ${col}, ${row}`}
                            disabled={!canAct || opened !== undefined}
                            onClick={() => void session.openFieldItem(col, row)}
                        >
                            {opened ? opened.item.replace(/^type/, "") : "?"}
                        </button>
                    );
                })}
            </div>
        </Dialog>
    );
}
