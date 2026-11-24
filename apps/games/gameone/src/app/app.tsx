import type { SlotSession } from "@fep/game-core/slot";
import { SlotHud } from "@fep/hud/slot";
import type { GameState } from "@fep/protocol/slot";

export function App({ session }: { session: SlotSession<GameState> }) {
  return <SlotHud session={session} />;
}

export default App;
