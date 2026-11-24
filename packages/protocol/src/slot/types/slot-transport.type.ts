import type { TournamentsResponse } from "../../common/types/tournaments-response.type";
import type { InitResponse } from "./init-response.type";
import type { SlotActionBodies } from "./slot-action-bodies.type";
import type { SlotActionEndpoint } from "./slot-action-endpoint.type";

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
