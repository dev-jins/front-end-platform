import type { SlotTransport } from "@fep/protocol/slot";

import type { SessionError } from "../../common/types/session-error.type";
import type { Round } from "./round.type";
import type { StateAdapter } from "./state-adapter.type";

export interface SlotSessionOptions<S> {
    sessionKey: string;
    /** Also used for operator freespins handoff (`externalFreespins.nextSessionKey`). */
    createTransport(sessionKey: string): SlotTransport;
    adapter: StateAdapter<S>;
    /** Plays a round on screen; resolves when reels have landed. Default resolves at once. */
    present?(round: Round<S>): Promise<void>;
    /** WARNING level errors (e.g. 300 language fallback). Default: console.warn. */
    onWarning?(error: SessionError): void;
}
