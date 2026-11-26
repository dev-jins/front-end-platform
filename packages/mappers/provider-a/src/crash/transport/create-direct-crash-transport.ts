import { toGameApiError } from "@fep/protocol";
import { type CrashTransport, subscribeSse } from "@fep/protocol/crash";

import { myStatsSchema } from "../schemas/my-stats.schema";
import { nativeCrashInitSchema } from "../schemas/native-crash-init.schema";
import { nativeEventSchema } from "../schemas/native-event.schema";
import type { DirectCrashTransportOptions } from "../types/direct-crash-transport-options.type";
import type { NativeCrashInit } from "../types/native-crash-init.type";
import { toCrashCommandResult } from "../utils/to-crash-command-result";
import { toCrashInit } from "../utils/to-crash-init";
import { toCrashSnapshot } from "../utils/to-crash-snapshot";
import { toCrashTick } from "../utils/to-crash-tick";
import { toNativeCommand } from "../utils/to-native-command";

/**
 * Provider A straight from the browser: Game API for commands, its Mercure hub for events. Phase 0, until the gateway
 * runs Connector A. Event payloads are not documented, so only `tick` is translated directly; every other event
 * triggers a myStats call (bursts merged) that becomes a fresh `snapshot`.
 * TODO[techdebt]: map each native event to its canonical event once Provider A's payloads are documented.
 */
export function createDirectCrashTransport(options: DirectCrashTransportOptions): CrashTransport {
    const {
        baseUrl,
        sessionKey,
        // Wrapped so the browser's fetch is never called unbound ("Illegal invocation").
        fetch: fetchFn = (input, init) => globalThis.fetch(input, init),
        retryDelaysMs = [1000, 2000, 5000],
        resyncDelayMs = 250,
    } = options;
    const gameUrl = `${baseUrl.replace(/\/+$/, "")}/api/v1/game/${encodeURIComponent(sessionKey)}`;
    let session: Pick<NativeCrashInit, "fingerprint" | "server"> | undefined;

    function requireSession() {
        if (!session) throw new Error("CrashTransport: call init() first");
        return session;
    }

    async function request(path: string, payload?: Record<string, string>): Promise<unknown> {
        const response = await fetchFn(gameUrl + path, {
            method: payload ? "POST" : "GET",
            headers: payload
                ? { Accept: "application/json", "Content-Type": "application/json" }
                : { Accept: "application/json" },
            body: payload ? JSON.stringify(payload) : undefined,
        });
        const text = await response.text();
        let body: unknown;
        try {
            body = text ? JSON.parse(text) : undefined;
        } catch {
            body = text;
        }
        if (!response.ok) throw toGameApiError(response.status, body);
        return body;
    }

    return {
        async init() {
            const native = nativeCrashInitSchema.parse(await request(""));
            session = { fingerprint: native.fingerprint, server: native.server };
            return toCrashInit(native, options);
        },

        async play(command) {
            const { path, body } = toNativeCommand(command, requireSession().fingerprint);
            return toCrashCommandResult(path, await request(`/crash/${path}`, body));
        },

        subscribe({ onEvent, onStatus, onError }) {
            const { server } = requireSession();
            let closed = false;
            let seq = 0;
            /** Ticks are dropped until this connection's snapshot is out: the snapshot must come first. */
            let synced = false;
            let roundId: string | undefined;
            let timer: ReturnType<typeof setTimeout> | undefined;
            let inFlight = false;
            let pending = false;

            async function resync() {
                inFlight = true;
                try {
                    const stats = myStatsSchema.parse(await request("/crash/myStats"));
                    const snapshot = toCrashSnapshot(stats, seq + 1, Date.now());
                    if (closed) return;
                    seq += 1;
                    roundId = stats.roundId;
                    synced = true;
                    onEvent(snapshot);
                } catch (error) {
                    if (!closed) onError?.(error);
                } finally {
                    inFlight = false;
                    if (pending && !closed) {
                        pending = false;
                        scheduleResync();
                    }
                }
            }

            /** A queued call already covers changes that arrive before it starts; one running needs a follow-up. */
            function scheduleResync() {
                if (timer !== undefined) return;
                if (inFlight) {
                    pending = true;
                    return;
                }
                timer = setTimeout(() => {
                    timer = undefined;
                    void resync();
                }, resyncDelayMs);
            }

            const mercureUrl = new URL(server.url);
            mercureUrl.searchParams.append("topic", server.publicTopic);
            mercureUrl.searchParams.append("topic", server.playerTopic);

            const close = subscribeSse({
                url: mercureUrl.href,
                headers: { Authorization: `Bearer ${server.subscriberToken}` },
                fetch: fetchFn,
                retryDelaysMs,
                onError,
                onStatus(status) {
                    if (status === "live") {
                        synced = false;
                        clearTimeout(timer);
                        timer = undefined;
                        if (inFlight) pending = true;
                        else void resync();
                    }
                    onStatus(status);
                },
                onMessage({ data }) {
                    let event: ReturnType<typeof nativeEventSchema.parse>;
                    try {
                        event = nativeEventSchema.parse(JSON.parse(data));
                    } catch (error) {
                        onError?.(error);
                        return;
                    }
                    if (event.type !== "tick") {
                        scheduleResync();
                        return;
                    }
                    if (!synced) return;
                    // TODO[techdebt]: Provider A sends no server time; client time means a zero clock offset.
                    const tick = toCrashTick(event, roundId, seq + 1, Date.now());
                    if (!tick) {
                        scheduleResync();
                        return;
                    }
                    seq += 1;
                    onEvent(tick);
                },
            });

            return () => {
                closed = true;
                clearTimeout(timer);
                close();
            };
        },
    };
}
