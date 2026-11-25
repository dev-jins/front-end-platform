import type { CrashConnectionStatus } from "./crash-connection-status.type";
import type { CrashEvent } from "./crash-event.type";

export interface CrashStreamHandlers {
    /** The first event of every connection is `snapshot`. Events may repeat after a reconnect: dedupe by `seq`. */
    onEvent(event: CrashEvent): void;
    onStatus(status: CrashConnectionStatus): void;
    /** For logs only: a dropped connection (retried), a malformed event or an unknown event type (both skipped). */
    onError?(error: unknown): void;
}
