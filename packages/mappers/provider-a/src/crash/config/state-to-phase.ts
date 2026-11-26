import type { CrashPhase } from "@fep/protocol/crash";

/**
 * Provider A `state` → canonical phase.
 * TODO[techdebt]: `state` values are not documented; these are guesses from the event names. Replace with the real
 * list once Provider A confirms it — an unknown state fails the snapshot loudly instead of guessing.
 */
export const STATE_TO_PHASE: Readonly<Record<string, CrashPhase>> = {
    round_start: "starting",
    starting: "starting",
    waiting: "starting",
    countDown: "countdown",
    countdown: "countdown",
    betting: "countdown",
    running: "running",
    crash: "crashed",
    crashed: "crashed",
};
