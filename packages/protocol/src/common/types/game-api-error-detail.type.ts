import type { ErrorLevel } from "./error-level.type";
import type { Violation } from "./violation.type";

export type GameApiErrorDetail =
    | { kind: "business"; code: number; level: ErrorLevel; message: string }
    | { kind: "validation"; violations: Violation[] }
    | { kind: "parse"; message: string }
    | { kind: "not-found" }
    | { kind: "unexpected"; body: unknown };
