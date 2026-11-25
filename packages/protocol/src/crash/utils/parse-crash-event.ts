import { crashEventSchema } from "../schemas/crash-event.schema";
import type { CrashEvent } from "../types/crash-event.type";

const KNOWN_TYPES = new Set<unknown>(crashEventSchema.options.map((option) => option.shape.type.value));

/**
 * Reads one stream event. Returns null for an unknown `type` (the gateway may add types before the client knows
 * them: log and skip). Throws a ZodError when a known type has the wrong shape.
 */
export function parseCrashEvent(raw: unknown): CrashEvent | null {
    const type = typeof raw === "object" && raw !== null ? (raw as { type?: unknown }).type : undefined;
    if (!KNOWN_TYPES.has(type)) return null;
    return crashEventSchema.parse(raw);
}
