import type { CrashTransport } from "@fep/protocol/crash";

import type { SessionError } from "../../common/types/session-error.type";

export interface CrashSessionOptions {
    /** Gateway, direct or mock: picked by the app from launch config. */
    transport: CrashTransport;
    /** WARNING level errors. Default: console.warn. */
    onWarning?(error: SessionError): void;
    /** Skipped / malformed stream events and dropped connections, for logs. Default: console.warn. */
    onStreamError?(error: unknown): void;
    /** Default: `crypto.randomUUID()`. */
    createRequestId?(): string;
    /** Default: `Date.now()`. */
    now?(): number;
    /** Runs `flush` once after a burst of events. Default: `setTimeout(flush, 16)`, about once per frame. */
    scheduleFlush?(flush: () => void): void;
}
