/** `offline`: the gateway refused the stream (401 / 403 / 404) and the transport stopped retrying. */
export type CrashConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";
