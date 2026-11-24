import type { ActionBase } from "./action-base.type";

/** Request body per action endpoint. `lines` must be an integer; `bet` / `variant` accept number or numeric string. */
export interface SlotActionBodies {
    spin: ActionBase & { bet: string | number; lines: number; currentMode?: number; strength?: number };
    freespin: ActionBase & { tapsCount?: number; hash?: number };
    buy: ActionBase & { bet: string | number };
    respin: ActionBase;
    avalanche: ActionBase;
    bonus: ActionBase & { variant: string | number };
    getPreviousState: ActionBase;
    jackpot: ActionBase;
    /** 1-based cell. */
    "open-field-item": ActionBase & { col: number; row: number };
}
