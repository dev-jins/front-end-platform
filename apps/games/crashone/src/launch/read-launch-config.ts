import type { LaunchConfig } from "./types/launch-config.type";
import type { LaunchEnv } from "./types/launch-env.type";

/**
 * Launch config from the game URL the lobby opened, plus build env:
 * - `?launchToken=…` → gateway (`VITE_GATEWAY_URL`; `?gatewayUrl=` overrides it in dev builds only);
 * - `?sessionKey=…` → Provider A direct (`VITE_API_URL`), `&demo=1` for a demo session;
 * - nothing → the dev mock, only in a dev build, so a production build never shows fake money.
 * Throws when a mode is asked for but cannot be set up.
 */
export function readLaunchConfig(search: string, env: LaunchEnv, dev: boolean): LaunchConfig {
    const params = new URLSearchParams(search);
    const launchToken = params.get("launchToken");
    const sessionKey = params.get("sessionKey");

    if (launchToken) {
        // Never from the URL in production: a crafted link would send the launch token to any host and trust its answers.
        const gatewayUrl = (dev ? params.get("gatewayUrl") : null) ?? env.VITE_GATEWAY_URL;
        if (!gatewayUrl) throw new Error("Launch config: a launchToken needs VITE_GATEWAY_URL");
        return { transport: "gateway", gatewayUrl, launchToken };
    }
    if (sessionKey) {
        if (!env.VITE_API_URL) throw new Error("Launch config: a sessionKey needs VITE_API_URL");
        return { transport: "direct", apiUrl: env.VITE_API_URL, sessionKey, demo: params.get("demo") === "1" };
    }
    if (!dev) throw new Error("Launch config: open the game from the lobby (no launchToken or sessionKey)");
    return { transport: "mock" };
}
