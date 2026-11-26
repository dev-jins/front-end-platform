import type { CrashEvent } from "@fep/protocol/crash";

export type CrashTickEvent = Extract<CrashEvent, { type: "tick" }>;
