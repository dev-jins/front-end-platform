import type { LaneId } from "@fep/protocol/crash";
import type { StoreApi } from "zustand/vanilla";

import type { CrashState } from "../../store/types/crash-state.type";

export interface CrashSession {
    store: StoreApi<CrashState>;
    /** Opens the session (init, once per game start; later calls are ignored), then the event stream. */
    start(): Promise<void>;
    // Intents resolve false (and send nothing) when not allowed now: wrong phase, a command already in flight, no
    // live connection, an open error, or a value the server would reject.
    /** `amount` / `autoCashout` are numeric strings. */
    bet(lane: LaneId, amount: string, autoCashout?: string): Promise<boolean>;
    cancelBet(lane: LaneId): Promise<boolean>;
    cashout(lane: LaneId): Promise<boolean>;
    /** Close the error dialog. */
    dismissError(): void;
    /** Closes the stream and drops queued events. */
    stop(): void;
}
