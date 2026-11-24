/**
 * loading → idle ⇄ requesting → presenting → idle … ; over = session cannot continue (CRITICAL).
 * Controls are enabled only in `idle`.
 */
export type SlotPhase = "loading" | "idle" | "requesting" | "presenting" | "over";
