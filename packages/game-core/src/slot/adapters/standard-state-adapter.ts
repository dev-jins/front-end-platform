import { type GameState, gameStateSchema } from "@fep/protocol/slot";

import type { StateAdapter } from "../types/state-adapter.type";

/** Adapter for games that use the standard state shape. */
export const standardStateAdapter: StateAdapter<GameState> = {
    parse(raw) {
        const state = gameStateSchema.parse(raw);
        const { nextStep, mode, totalWin, jackpotState } = state;
        return jackpotState ? { state, nextStep, mode, totalWin, jackpotState } : { state, nextStep, mode, totalWin };
    },
};
