import type { CrashState } from "@fep/game-core/crash";

/** What the crash HUD frame needs. Lane details are read per lane, so a tick only re-renders that lane's slot. */
export type CrashHudState = Pick<
    CrashState,
    "phase" | "connection" | "init" | "balance" | "error" | "history" | "topWins"
> & {
    /** Lane ids the snapshot sent, as "1" or "1,2,3": a string so the selection stays equal across ticks. */
    laneIds: string;
};
