import type { Round } from "./round.type";

/**
 * Parses one game's state (init `lastSpin` or an action response). Variant games (Space Infinity, Fruit Storm, …)
 * ship their own; game-specific shapes never leak into game-core.
 */
export interface StateAdapter<S> {
    parse(raw: unknown): Round<S>;
}
