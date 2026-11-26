/**
 * Where this game start gets its data, from the game URL the lobby opened plus build env:
 * - `?sessionKey=…` → the Game API at `VITE_API_URL`;
 * - nothing → null: the dev mock, only in a dev build, so a production build never shows fake money.
 * Throws when the game cannot be set up.
 */
export function readLaunchConfig(
    search: string,
    apiUrl: string | undefined,
    dev: boolean
): { apiUrl: string; sessionKey: string } | null {
    const sessionKey = new URLSearchParams(search).get("sessionKey");
    if (sessionKey) {
        if (!apiUrl) throw new Error("Launch config: a sessionKey needs VITE_API_URL");
        return { apiUrl, sessionKey };
    }
    if (!dev) throw new Error("Launch config: open the game from the lobby (no sessionKey)");
    return null;
}
