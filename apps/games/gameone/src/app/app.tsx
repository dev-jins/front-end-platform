import { useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { SlotSession } from "@fep/game-core/slot";
import type { GameState } from "@fep/protocol/slot";

/** Stable fallback: a new `[]` per render would defeat useShallow and loop forever. */
const NO_BETS: string[] = [];

// ponytail: minimal HUD to drive the reels; replaced by packages/hud (bet panel, money formatting, popups).
export function App({ session }: { session: SlotSession<GameState> }) {
  const { phase, balance, win, bets, currency, error } = useStore(
    session.store,
    useShallow((s) => ({
      phase: s.phase,
      balance: s.balance,
      win: s.displayed?.totalWin ?? "0",
      bets: s.init?.bets ?? NO_BETS,
      currency: s.init?.currency ?? "",
      error: s.error,
    }))
  );
  const [selectedBet, setSelectedBet] = useState<string | null>(null);
  const bet = selectedBet ?? bets[0] ?? "";

  return (
    <>
      <div className="hud">
        <span>
          Balance {balance ?? "…"} {currency}
        </span>
        <span>Win {win}</span>
        <label>
          Bet{" "}
          <select value={bet} onChange={(e) => setSelectedBet(e.target.value)} disabled={phase !== "idle"}>
            {bets.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <button type="button" disabled={phase !== "idle" || error !== null} onClick={() => void session.spin(bet)}>
          Spin
        </button>
      </div>

      {error && (
        <div className="dialog" role="alertdialog" aria-label="Game error">
          <div>
            <p>{phase === "over" ? `Session over: ${error.message}` : error.message}</p>
            {phase !== "over" && (
              <button type="button" onClick={() => void session.dismissError()}>
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
