import type { DirectCrashTransportOptions } from "@fep/mapper-provider-a/crash";

/**
 * What Provider A's API does not send, for direct mode. With the gateway this comes from init instead.
 * TODO[techdebt]: placeholder ids, limits and capabilities — confirm with Provider A for this game.
 */
export const PROVIDER_A_GAME_CONFIG: Pick<DirectCrashTransportOptions, "game" | "decimals" | "bets" | "capabilities"> =
    {
        game: { id: "prov-a:crashone", provider: "prov-a", clientId: "crashone" },
        decimals: 2,
        bets: { min: "0.10", max: "100.00", default: "1.00" },
        capabilities: {
            lanes: 1,
            autoCashout: { min: "1.01" },
            curve: { kind: "ticks" },
            liveBets: true,
            betWhileRunning: "reject",
            freeRounds: false,
        },
    };
