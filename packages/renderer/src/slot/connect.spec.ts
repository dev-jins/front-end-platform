import { createStore } from "zustand/vanilla";

import type { SlotState } from "@fep/game-core/slot";
import type { GameState } from "@fep/protocol/slot";

import { connectSpinView } from "./connect.js";

const REELS = [
  { number: 1, symbols: ["a", "b"] },
  { number: 2, symbols: ["c", "d"] },
];

function setup() {
  const store = createStore<SlotState<GameState>>()(() => ({
    phase: "idle",
    init: null,
    displayed: { state: { reels: REELS } as GameState, nextStep: "spin", mode: "spin", totalWin: "0" },
    balance: "100",
    pending: null,
    externalFreespins: null,
    tournamentStartPopup: null,
    tournamentWinnerPopup: null,
    error: null,
  }));
  const view = { startSpin: vi.fn(), stopOn: vi.fn(async () => undefined) };
  const disconnect = connectSpinView(store, view);
  return { store, view, disconnect };
}

describe("connectSpinView", () => {
  it("starts the spin as soon as the request goes out", () => {
    const { store, view } = setup();
    store.setState({ phase: "requesting" });
    expect(view.startSpin).toHaveBeenCalledOnce();
  });

  it("leaves landing to present() when the request succeeds", () => {
    const { store, view } = setup();
    store.setState({ phase: "requesting" });
    store.setState({ phase: "presenting" });
    store.setState({ phase: "idle" });
    expect(view.stopOn).not.toHaveBeenCalled();
  });

  it("lands back on the displayed reels when the request fails", () => {
    const { store, view } = setup();
    store.setState({ phase: "requesting" });
    store.setState({ phase: "over" });
    expect(view.stopOn).toHaveBeenCalledWith([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("ignores updates that don't change the phase, and stops after disconnect", () => {
    const { store, view, disconnect } = setup();
    store.setState({ balance: "90" });
    disconnect();
    store.setState({ phase: "requesting" });
    expect(view.startSpin).not.toHaveBeenCalled();
  });
});
