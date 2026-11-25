import { GameApiError } from "../../common/errors/game-api-error";
import { crashCommandResultSchema } from "../schemas/crash-command-result.schema";
import { crashInitSchema } from "../schemas/crash-init.schema";
import type { CrashTransport } from "../types/crash-transport.type";
import type { GatewayCrashTransportOptions } from "../types/gateway-crash-transport-options.type";
import { parseCrashEvent } from "../utils/parse-crash-event";
import { readSseMessages } from "../utils/read-sse-messages";

/** Statuses where retrying the stream cannot help. */
const FATAL_STREAM_STATUSES = new Set([401, 403, 404]);

/** Production transport: HTTPS commands to the gateway, events from its SSE stream. */
export function createGatewayCrashTransport({
    baseUrl,
    launchToken,
    // Wrapped so the browser's fetch is never called unbound ("Illegal invocation").
    fetch: fetchFn = (input, init) => globalThis.fetch(input, init),
    retryDelaysMs = [1000, 2000, 5000],
}: GatewayCrashTransportOptions): CrashTransport {
    const origin = baseUrl.replace(/\/+$/, "");
    let session: { token: string; streamUrl: string } | undefined;

    function requireSession() {
        if (!session) throw new Error("CrashTransport: call init() first");
        return session;
    }

    async function post(path: string, token: string, payload?: unknown): Promise<unknown> {
        const response = await fetchFn(origin + path, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload ?? {}),
        });
        const text = await response.text();
        let body: unknown;
        try {
            body = text ? JSON.parse(text) : undefined;
        } catch {
            body = text;
        }
        // TODO[techdebt]: map the gateway's canonical error taxonomy (docs/multi-provider-gateway.html, "Canonical
        // error taxonomy") into its own detail kind once its schema exists; until then callers get the raw body.
        if (!response.ok) throw new GameApiError(response.status, { kind: "unexpected", body });
        return body;
    }

    return {
        async init() {
            const init = crashInitSchema.parse(await post("/v1/sessions", launchToken));
            session = { token: init.session.token, streamUrl: new URL(init.stream.url, `${origin}/`).href };
            return init;
        },

        async play(command) {
            return crashCommandResultSchema.parse(await post("/v1/play", requireSession().token, command));
        },

        subscribe({ onEvent, onStatus, onError }) {
            const { token, streamUrl } = requireSession();
            let closed = false;
            let controller: AbortController | undefined;
            let retryTimer: ReturnType<typeof setTimeout> | undefined;
            let lastEventId: string | undefined;

            function handle(data: string) {
                try {
                    const event = parseCrashEvent(JSON.parse(data));
                    if (event) onEvent(event);
                    else onError?.(new Error(`CrashTransport: skipped unknown event ${data}`));
                } catch (error) {
                    onError?.(error);
                }
            }

            async function connect(attempt: number): Promise<void> {
                onStatus(attempt === 0 ? "connecting" : "reconnecting");
                controller = new AbortController();
                try {
                    const response = await fetchFn(streamUrl, {
                        headers: {
                            Accept: "text/event-stream",
                            Authorization: `Bearer ${token}`,
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
                        handle(message.data);
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
        },
    };
}
