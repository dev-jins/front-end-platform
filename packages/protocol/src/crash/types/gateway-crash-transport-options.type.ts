export interface GatewayCrashTransportOptions {
    /** Origin of the game gateway, e.g. `https://gw.example.com`. */
    baseUrl: string;
    /** Launch token from `/v1/launch`. Only used to open the session; later calls use the session token. */
    launchToken: string;
    fetch?: typeof fetch;
    /** Wait before each reconnect attempt; the last value repeats. Default 1s, 2s, 5s. */
    retryDelaysMs?: number[];
}
