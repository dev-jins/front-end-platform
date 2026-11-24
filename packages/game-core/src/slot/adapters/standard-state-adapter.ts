import { type GameState, gameStateSchema } from "@fep/protocol/slot";

import type { StateAdapter } from "../types/state-adapter.type";

/** Adapter for games that use the standard state shape. */
export const standardStateAdapter: StateAdapter<GameState> = {
    parse(raw) {
        const state = gameStateSchema.parse(raw);
        return { state, nextStep: state.nextStep, mode: state.mode, totalWin: state.totalWin };
    },
};
