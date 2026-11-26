import type { CrashConnectionStatus } from "./crash-connection-status.type";
import type { SseMessage } from "./sse-message.type";

export interface SubscribeSseOptions {
    url: string;
    /** Sent with every (re)connect, e.g. `Authorization`. `Accept` and `Last-Event-ID` are added. */
    headers: Record<string, string>;
    fetch: typeof fetch;
    /** Wait before each reconnect attempt; the last value repeats. */
    retryDelaysMs: number[];
    onMessage(message: SseMessage): void;
    onStatus(status: CrashConnectionStatus): void;
    onError?(error: unknown): void;
}
