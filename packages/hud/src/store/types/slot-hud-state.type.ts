import type { Round, SlotState } from "@fep/game-core/slot";

/** The slice of the session store the HUD renders. */
export type SlotHudState<S> = Pick<SlotState<S>, "phase" | "init" | "balance" | "error"> & {
    win: string | null;
    mode: Round<S>["mode"] | null;
    nextStep: Round<S>["nextStep"] | null;
    jackpotState: NonNullable<Round<S>["jackpotState"]> | null;
    startPopup: SlotState<S>["tournamentStartPopup"];
    winnerPopup: SlotState<S>["tournamentWinnerPopup"];
};
