import type { CrashInit } from "@fep/protocol/crash";

import type { DirectCrashTransportOptions } from "../types/direct-crash-transport-options.type";
import type { NativeCrashInit } from "../types/native-crash-init.type";

/** Native init + launch / game config → canonical init. Provider A has no session expiry, so `expiresAt` is null. */
export function toCrashInit(native: NativeCrashInit, options: DirectCrashTransportOptions): CrashInit {
    return {
        session: { token: options.sessionKey, expiresAt: null, demo: options.demo },
        game: { ...options.game, family: "crash" },
        money: {
            balance: native.crashInit.balance.amount,
            currency: native.crashInit.balance.currency,
            decimals: options.decimals,
        },
        bets: options.bets,
        capabilities: { crash: options.capabilities },
        stream: { kind: "sse", url: native.server.url },
    };
}
