/** Which transport this game start uses (docs/crash-architecture.html, "Who decides SSE or WebSocket?", level 1). */
export type LaunchConfig =
    | { transport: "gateway"; gatewayUrl: string; launchToken: string }
    | { transport: "direct"; apiUrl: string; sessionKey: string; demo: boolean }
    | { transport: "mock" };
