import type { LaneState } from "@fep/protocol/crash";

import type { CrashPendingCommand } from "./crash-pending-command.type";

/** A lane as the snapshot sends it, plus the client-only command in flight. */
export type CrashLaneState = LaneState & { pending: CrashPendingCommand | null };
