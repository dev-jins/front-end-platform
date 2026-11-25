import type { CrashCommand } from "./crash-command.type";
import type { CrashCommandResult } from "./crash-command-result.type";
import type { CrashEvent } from "./crash-event.type";
import type { CrashInit } from "./crash-init.type";

export interface MockCrashTransportOptions {
    init: CrashInit;
    /** Recorded timeline, starting with a `snapshot`. Replayed with the gaps between their `serverTime`s. */
    events: CrashEvent[];
    /** Replay speed: 2 plays twice as fast, `Infinity` emits everything at once. Default 1. */
    speed?: number;
    /** Answers commands. Without it `play` rejects. */
    play?(command: CrashCommand): CrashCommandResult | Promise<CrashCommandResult>;
}
