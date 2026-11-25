import type { CrashTransport } from "../types/crash-transport.type";
import type { MockCrashTransportOptions } from "../types/mock-crash-transport-options.type";

/** Dev and test transport: no network, replays a recorded timeline on every subscribe. */
export function createMockCrashTransport({ init, events, speed = 1, play }: MockCrashTransportOptions): CrashTransport {
    return {
        init: async () => init,

        play: async (command) => {
            if (!play) throw new Error("MockCrashTransport: no play handler");
            return play(command);
        },

        subscribe({ onEvent, onStatus }) {
            const timers: ReturnType<typeof setTimeout>[] = [];
            const start = events[0]?.serverTime ?? 0;
            onStatus("connecting");
            timers.push(setTimeout(() => onStatus("live"), 0));
            for (const event of events) {
                const delay = Number.isFinite(speed) ? (event.serverTime - start) / speed : 0;
                timers.push(setTimeout(() => onEvent(event), delay));
            }
            return () => {
                for (const timer of timers) clearTimeout(timer);
            };
        },
    };
}
