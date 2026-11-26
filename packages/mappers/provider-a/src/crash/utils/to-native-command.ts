import type { CrashCommand } from "@fep/protocol/crash";

import type { NativeCommand } from "../types/native-command.type";

const PATHS = { bet: "bet", cancelBet: "cancelBet", cashout: "push" } as const;

/** Canonical command → Provider A request. `lane` is dropped: only non-lane games are supported. */
export function toNativeCommand(command: CrashCommand, fingerprint: string | undefined): NativeCommand {
    const body: Record<string, string> = fingerprint === undefined ? {} : { fingerprint };
    if (command.action === "bet") {
        body.bet = command.bet;
        if (command.autoCashout !== undefined) body.autoCashout = command.autoCashout;
    }
    return { path: PATHS[command.action], body };
}
