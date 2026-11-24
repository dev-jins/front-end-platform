import { tournamentsResponseSchema } from "../../common/schemas/tournaments-response.schema";
import { toGameApiError } from "../../common/utils/to-game-api-error";
import { initResponseSchema } from "../schemas/init-response.schema";
import type { SlotHttpTransportOptions } from "../types/slot-http-transport-options.type";
import type { SlotTransport } from "../types/slot-transport.type";

export function createSlotHttpTransport({
    baseUrl,
    sessionKey,
    // Wrapped so the browser's fetch is never called unbound ("Illegal invocation").
    fetch: fetchFn = (input, init) => globalThis.fetch(input, init),
}: SlotHttpTransportOptions): SlotTransport {
    const gameUrl = `${baseUrl.replace(/\/+$/, "")}/api/v1/game/${encodeURIComponent(sessionKey)}`;

    async function request(path: string, method: "GET" | "POST", payload?: unknown): Promise<unknown> {
        const hasBody = payload !== undefined;
        const response = await fetchFn(gameUrl + path, {
            method,
            headers: hasBody
                ? { Accept: "application/json", "Content-Type": "application/json" }
                : { Accept: "application/json" },
            body: hasBody ? JSON.stringify(payload) : undefined,
        });
        const text = await response.text();
        let body: unknown;
        if (text) {
            try {
                body = JSON.parse(text);
            } catch {
                body = text;
            }
        }
        if (!response.ok) throw toGameApiError(response.status, body);
        return body;
    }

    return {
        init: async () => initResponseSchema.parse(await request("", "GET")),
        action: (endpoint, body) => request(`/${endpoint}`, "POST", body),
        tournaments: async () => tournamentsResponseSchema.parse(await request("/tournaments", "GET")),
        stat: async (action, payload) => {
            await request(`/stat/${encodeURIComponent(action)}`, "POST", payload);
        },
    };
}
