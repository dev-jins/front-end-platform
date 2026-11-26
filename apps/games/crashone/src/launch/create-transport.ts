import { createDirectCrashTransport } from "@fep/mapper-provider-a/crash";
import { type CrashTransport, createGatewayCrashTransport } from "@fep/protocol/crash";

import { PROVIDER_A_GAME_CONFIG } from "../config/provider-a-game-config";
import { createDevCrashTransport } from "../dev/create-dev-crash-transport";
import type { LaunchConfig } from "./types/launch-config.type";

/** The only place that knows which transport is behind the game; everything else sees `CrashTransport`. */
export function createTransport(config: LaunchConfig): CrashTransport {
    switch (config.transport) {
        case "gateway":
            return createGatewayCrashTransport({ baseUrl: config.gatewayUrl, launchToken: config.launchToken });
        case "direct":
            return createDirectCrashTransport({
                ...PROVIDER_A_GAME_CONFIG,
                baseUrl: config.apiUrl,
                sessionKey: config.sessionKey,
                demo: config.demo,
            });
        case "mock":
            return createDevCrashTransport();
    }
}
