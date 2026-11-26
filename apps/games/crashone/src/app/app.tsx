import type { CrashSession } from "@fep/game-core/crash";
import { CrashHud } from "@fep/hud/crash";

export function App({ session }: { session: CrashSession }) {
    return <CrashHud session={session} />;
}

export default App;
