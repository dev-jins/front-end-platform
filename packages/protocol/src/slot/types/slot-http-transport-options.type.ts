export interface SlotHttpTransportOptions {
    /** Origin of the Game API, e.g. `https://api.example.com`. */
    baseUrl: string;
    sessionKey: string;
    fetch?: typeof fetch;
}
