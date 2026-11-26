/** loading → ready; over = session cannot continue (CRITICAL). Round phases live per lane. */
export type CrashSessionPhase = "loading" | "ready" | "over";
