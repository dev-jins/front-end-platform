import { toGameApiError } from "../common/errors.js";
import { type TournamentsResponse, tournamentsResponseSchema } from "../common/schemas.js";
import { type InitResponse, initResponseSchema } from "./schemas.js";

type ActionBase = { fingerprint: string; spinSpeed?: string };

/** Request body per action endpoint. `lines` must be an integer; `bet` / `variant` accept number or numeric string. */
export interface SlotActionBodies {
  spin: ActionBase & { bet: string | number; lines: number; currentMode?: number; strength?: number };
  freespin: ActionBase & { tapsCount?: number; hash?: number };
  buy: ActionBase & { bet: string | number };
  respin: ActionBase;
  avalanche: ActionBase;
  bonus: ActionBase & { variant: string | number };
  getPreviousState: ActionBase;
  jackpot: ActionBase;
  /** 1-based cell. */
  "open-field-item": ActionBase & { col: number; row: number };
}
export type SlotActionEndpoint = keyof SlotActionBodies;

/** Talks to the slot Game API (HTTP, request → response) for one session. Stateless: the caller owns the fingerprint. */
export interface SlotTransport {
  /** Rotates the fingerprint and invalidates the previous one. Call once per game start. */
  init(): Promise<InitResponse>;
  /** Raw action response; its state shape is game specific, parse it with the game adapter. */
  action<E extends SlotActionEndpoint>(endpoint: E, body: SlotActionBodies[E]): Promise<unknown>;
  tournaments(): Promise<TournamentsResponse>;
  /** Lifecycle event, e.g. `loaded` after assets load. */
  stat(action: string, payload?: unknown): Promise<void>;
}

export interface SlotHttpTransportOptions {
  /** Origin of the Game API, e.g. `https://api.example.com`. */
  baseUrl: string;
  sessionKey: string;
  fetch?: typeof fetch;
}

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
    let body: unknown = undefined;
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
