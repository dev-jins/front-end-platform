import type { SseMessage } from "../types/sse-message.type";

/**
 * Parses a Server-Sent Events body (WHATWG spec subset): `data` and `id` fields, comments (heartbeats) and `event` /
 * `retry` ignored. Used instead of `EventSource`, which cannot send an `Authorization` header.
 */
export async function* readSseMessages(body: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
    const decoder = new TextDecoder();
    const reader = body.getReader();
    let buffer = "";
    let id: string | undefined;
    let data: string[] = [];

    function* takeLines(final: boolean): Generator<string> {
        let match = /\r\n|\r|\n/.exec(buffer);
        // A trailing \r may be the first half of \r\n: wait for the next chunk, unless the stream ended.
        while (match && (final || !(match[0] === "\r" && match.index === buffer.length - 1))) {
            yield buffer.slice(0, match.index);
            buffer = buffer.slice(match.index + match[0].length);
            match = /\r\n|\r|\n/.exec(buffer);
        }
    }

    try {
        while (true) {
            const { value, done } = await reader.read();
            buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

            for (const line of takeLines(done)) {
                if (line === "") {
                    if (data.length > 0) yield { id, data: data.join("\n") };
                    data = [];
                    continue;
                }
                if (line.startsWith(":")) continue;

                const colon = line.indexOf(":");
                const field = colon === -1 ? line : line.slice(0, colon);
                const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
                if (field === "data") data.push(value);
                else if (field === "id" && !value.includes("\0")) id = value;
            }
            // An unterminated last message is dropped, as the spec says.
            if (done) return;
        }
    } finally {
        reader.releaseLock();
    }
}
