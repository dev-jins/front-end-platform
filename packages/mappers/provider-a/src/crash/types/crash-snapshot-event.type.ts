import type { CrashEvent } from "@fep/protocol/crash";

export type CrashSnapshotEvent = Extract<CrashEvent, { type: "snapshot" }>;
