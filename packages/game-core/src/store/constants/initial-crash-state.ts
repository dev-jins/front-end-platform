import type { CrashState } from "../types/crash-state.type";

export const initialCrashState: CrashState = {
    phase: "loading",
    connection: "connecting",
    init: null,
    lanes: {},
    history: [],
    topWins: [],
    myBets: [],
    balance: null,
    lastSeq: -1,
    clockOffsetMs: null,
    error: null,
};
