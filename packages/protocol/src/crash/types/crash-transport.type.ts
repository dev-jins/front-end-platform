import type { CrashCommand } from "./crash-command.type";
import type { CrashCommandResult } from "./crash-command-result.type";
import type { CrashInit } from "./crash-init.type";
import type { CrashStreamHandlers } from "./crash-stream-handlers.type";

/** The crash client's only dependency on the network. Canonical types in and out; the mode is picked at startup. */
export interface CrashTransport {
    /** Opens the session. Call once per game start, before `play` / `subscribe`. */
    init(): Promise<CrashInit>;
    play(command: CrashCommand): Promise<CrashCommandResult>;
    /** Opens the event stream and keeps it open (reconnecting) until the returned function is called. */
    subscribe(handlers: CrashStreamHandlers): () => void;
}
