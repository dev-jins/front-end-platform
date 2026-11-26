import type { GameState, Mode, Step } from "@fep/protocol/slot";

/** A played (or restored) step, normalized for game-core. `state` is the game specific part for HUD and renderer. */
export interface Round<S> {
    state: S;
    nextStep: Step;
    mode: Mode;
    totalWin: string;
    /** Match-three jackpot field, while the step has one open (`nextStep: "jackpot"`). Absent for games without it. */
    jackpotState?: NonNullable<GameState["jackpotState"]>;
}
