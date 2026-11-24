import type { TournamentStartPopup, TournamentWinnerPopup } from "@fep/protocol";
import type { ExternalFreespins, InitResponse } from "@fep/protocol/slot";

import type { SessionError } from "../../common/types/session-error.type";
import type { Round } from "../../slot/types/round.type";
import type { SlotPhase } from "./slot-phase.type";

export interface SlotState<S> {
    phase: SlotPhase;
    /** Game config from init: slot, bets, lines, currencyData, bonusParameters, … */
    init: InitResponse | null;
    /** What the screen shows. Only updated after the renderer has presented a round. */
    displayed: Round<S> | null;
    /** Balance matching `displayed`, not the server's latest. */
    balance: string | null;
    /** Server result being presented; null otherwise. */
    pending: Round<S> | null;
    externalFreespins: ExternalFreespins | null;
    /** One-shot popups: kept until dismissed, never overwritten by a later null. */
    tournamentStartPopup: TournamentStartPopup | null;
    tournamentWinnerPopup: TournamentWinnerPopup | null;
    error: SessionError | null;
}
