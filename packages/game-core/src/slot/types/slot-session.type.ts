import type { StoreApi } from "zustand/vanilla";

import type { SlotState } from "../../store/types/slot-state.type";

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
