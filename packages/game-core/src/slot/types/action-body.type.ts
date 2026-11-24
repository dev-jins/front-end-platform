import type { SlotActionBodies } from "@fep/protocol/slot";

/** Action body without `fingerprint`: the session adds it. */
export type ActionBody<E extends keyof SlotActionBodies> = Omit<SlotActionBodies[E], "fingerprint">;
