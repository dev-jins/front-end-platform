import type { CrashBet, CrashConnectionStatus, CrashInit, LaneId, MyBetRecord, RoundResult } from "@fep/protocol/crash";

import type { SessionError } from "../../common/types/session-error.type";
import type { CrashLaneState } from "./crash-lane-state.type";
import type { CrashSessionPhase } from "./crash-session-phase.type";

export interface CrashState {
    phase: CrashSessionPhase;
    connection: CrashConnectionStatus;
    /** Session, money, bet limits, capabilities. */
    init: CrashInit | null;
    /** Only the lanes the snapshot sent: lane 1 for games without lanes. */
    lanes: Partial<Record<LaneId, CrashLaneState>>;
    history: RoundResult[];
    topWins: CrashBet[];
    /** Newest first. */
    myBets: MyBetRecord[];
    balance: string | null;
    /** Highest `seq` applied; events at or below it are repeats after a reconnect. -1 before the first snapshot. */
    lastSeq: number;
    /** Server − client clock, ms. null until the first event. The ticker reads `Date.now() + clockOffsetMs`. */
    clockOffsetMs: number | null;
    error: SessionError | null;
}
