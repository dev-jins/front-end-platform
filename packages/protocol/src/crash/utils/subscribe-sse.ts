import { GameApiError } from "../../common/errors/game-api-error";
import type { SubscribeSseOptions } from "../types/subscribe-sse-options.type";
import { readSseMessages } from "./read-sse-messages";

/** Statuses where retrying the stream cannot help. */
const FATAL_STREAM_STATUSES = new Set([401, 403, 404]);

/**
 * Keeps an SSE stream open over `fetch` (so headers can be sent): reconnects after a drop with `Last-Event-ID`, goes
 * `offline` on 401 / 403 / 404. Returns a function that closes it for good.
 */
export function subscribeSse({
    url,
    headers,
    fetch: fetchFn,
    retryDelaysMs,
    onMessage,
    onStatus,
    onError,
}: SubscribeSseOptions): () => void {
    let closed = false;
    let controller: AbortController | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let lastEventId: string | undefined;

    async function connect(attempt: number): Promise<void> {
        onStatus(attempt === 0 ? "connecting" : "reconnecting");
        controller = new AbortController();
        try {
            const response = await fetchFn(url, {
                headers: {
                    ...headers,
                    Accept: "text/event-stream",
                    ...(lastEventId === undefined ? {} : { "Last-Event-ID": lastEventId }),
                },
                signal: controller.signal,
            });
            if (!response.ok || !response.body) {
                const error = new GameApiError(response.status, { kind: "unexpected", body: undefined });
                if (FATAL_STREAM_STATUSES.has(response.status)) {
                    onError?.(error);
                    onStatus("offline");
                    return;
                }
                throw error;
            }
            onStatus("live");
            attempt = 0;
            for await (const message of readSseMessages(response.body)) {
                lastEventId = message.id;
                onMessage(message);
            }
        } catch (error) {
            if (closed) return;
            onError?.(error);
        }
        if (closed) return;
        const delay = retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)] ?? 0;
        retryTimer = setTimeout(() => void connect(attempt + 1), delay);
    }

    void connect(0);
    return () => {
        closed = true;
        clearTimeout(retryTimer);
        controller?.abort();
    };
}
