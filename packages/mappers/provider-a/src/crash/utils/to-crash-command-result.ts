import type { CrashCommandResult } from "@fep/protocol/crash";

import { balanceResponseSchema } from "../schemas/balance-response.schema";
import { pushResponseSchema } from "../schemas/push-response.schema";
import type { NativeCommand } from "../types/native-command.type";

/** Parses a Provider A command response into the canonical result. */
export function toCrashCommandResult(path: NativeCommand["path"], raw: unknown): CrashCommandResult {
    if (path !== "push") return { balance: balanceResponseSchema.parse(raw).balance.amount };
    const push = pushResponseSchema.parse(raw);
    return { balance: push.balance.amount, cashout: { multiplier: push.multiplier, win: push.winAmount } };
}
