import type { CrashCommand } from "@fep/protocol/crash";

/** A command sent and not answered yet: blocks double clicks, shows a spinner. */
export type CrashPendingCommand = CrashCommand["action"];
