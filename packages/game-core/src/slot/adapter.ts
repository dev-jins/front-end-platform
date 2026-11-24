import { type GameState, type Mode, type Step, gameStateSchema } from "@fep/protocol/slot";

/** A played (or restored) step, normalized for game-core. `state` is the game specific part for HUD and renderer. */
export interface Round<S> {
  state: S;
  nextStep: Step;
  mode: Mode;
  totalWin: string;
}

/**
 * Parses one game's state (init `lastSpin` or an action response). Variant games (Space Infinity, Fruit Storm, …)
 * ship their own; game-specific shapes never leak into game-core.
 */
export interface StateAdapter<S> {
  parse(raw: unknown): Round<S>;
}

/** Adapter for games that use the standard state shape. */
export const standardStateAdapter: StateAdapter<GameState> = {
  parse(raw) {
    const state = gameStateSchema.parse(raw);
    return { state, nextStep: state.nextStep, mode: state.mode, totalWin: state.totalWin };
  },
};
