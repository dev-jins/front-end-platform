import type { CrashCapabilities, CrashInit } from "@fep/protocol/crash";

export interface DirectCrashTransportOptions {
    /** Origin of Provider A's Game API, e.g. `https://api.example.com`. */
    baseUrl: string;
    sessionKey: string;
    /** Not in Provider A's API: from the launch config. */
    game: { id: string; provider: string; clientId: string };
    demo: boolean;
    /** Not in Provider A's API: from the game's config. */
    decimals: number;
    bets: CrashInit["bets"];
    /** Lane games are not supported yet: their myStats shape is not documented. */
    capabilities: CrashCapabilities & { lanes: 1 };
    fetch?: typeof fetch;
    /** Wait before each stream reconnect; the last value repeats. Default 1s, 2s, 5s. */
    retryDelaysMs?: number[];
    /** Window that merges a burst of events into one myStats call. Default 250 ms. */
    resyncDelayMs?: number;
}
