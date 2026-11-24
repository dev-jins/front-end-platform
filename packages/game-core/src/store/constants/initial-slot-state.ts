import type { SlotState } from "../types/slot-state.type";

export const initialSlotState: SlotState<never> = {
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
