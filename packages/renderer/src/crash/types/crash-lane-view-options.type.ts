import type { CrashState } from "@fep/game-core/crash";
import type { LaneId } from "@fep/protocol/crash";
import type { Ticker } from "pixi.js";
import type { StoreApi } from "zustand/vanilla";

export interface CrashLaneViewOptions {
    /** The crash session's store; read every frame with `getState()`, never through React. */
    store: StoreApi<CrashState>;
    lane: LaneId;
    ticker: Ticker;
    width?: number;
    height?: number;
    /** Default `Date.now`. */
    now?: () => number;
}
