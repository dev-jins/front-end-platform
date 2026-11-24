import type { StoreApi } from "zustand/vanilla";

import type { SlotState } from "@fep/game-core/slot";
import type { GameState } from "@fep/protocol/slot";

import { reelColumns } from "./win-lines.js";

/** What the store binding needs from a scene. */
export interface SpinView {
  startSpin(): void;
  stopOn(columns: string[][]): Promise<void>;
}

/**
 * Drives the reels from the session phase, in addition to `present(round)` which lands them on a result:
 * - `requesting` starts the spin on click, hiding request latency;
 * - a failed request never reaches `presenting`, so the reels land back on what the screen showed before.
 * Returns the unsubscribe function.
 */
export function connectSpinView(store: StoreApi<SlotState<GameState>>, view: SpinView): () => void {
  return store.subscribe((state, previous) => {
    if (state.phase === previous.phase) return;
    if (state.phase === "requesting") view.startSpin();
    else if (previous.phase === "requesting" && state.phase !== "presenting" && state.displayed) {
      void view.stopOn(reelColumns(state.displayed.state.reels));
    }
  });
}
