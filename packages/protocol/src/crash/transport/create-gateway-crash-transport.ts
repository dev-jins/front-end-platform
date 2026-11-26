import { GameApiError } from "../../common/errors/game-api-error";
import { crashCommandResultSchema } from "../schemas/crash-command-result.schema";
import { crashInitSchema } from "../schemas/crash-init.schema";
import type { CrashTransport } from "../types/crash-transport.type";
import type { GatewayCrashTransportOptions } from "../types/gateway-crash-transport-options.type";
import { parseCrashEvent } from "../utils/parse-crash-event";
import { subscribeSse } from "../utils/subscribe-sse";

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
            return subscribeSse({
                url: streamUrl,
                headers: { Authorization: `Bearer ${token}` },
                fetch: fetchFn,
                retryDelaysMs,
                onStatus,
                onError,
                onMessage({ data }) {
                    try {
                        const event = parseCrashEvent(JSON.parse(data));
                        if (event) onEvent(event);
                        else onError?.(new Error(`CrashTransport: skipped unknown event ${data}`));
                    } catch (error) {
                        onError?.(error);
                    }
                },
            });
        },
    };
}
