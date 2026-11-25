import { readSseMessages } from "./read-sse-messages";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
            controller.close();
        },
    });
}

async function collect(...chunks: string[]) {
    const messages = [];
    for await (const message of readSseMessages(streamOf(...chunks))) messages.push(message);
    return messages;
}

describe("readSseMessages", () => {
    it("dispatches on a blank line and keeps the last id", async () => {
        expect(await collect("id: 1\ndata: a\n\ndata: b\n\n")).toEqual([
            { id: "1", data: "a" },
            { id: "1", data: "b" },
        ]);
    });

    it("joins multi-line data and handles lines split across chunks", async () => {
        expect(await collect('data: {"a":', "1}\nda", "ta: x\n", "\n")).toEqual([
            { id: undefined, data: '{"a":1}\nx' },
        ]);
    });

    it("accepts \\r\\n split between chunks and bare \\r", async () => {
        expect(await collect("data: a\r", "\n\r\ndata: b\r\r")).toEqual([
            { id: undefined, data: "a" },
            { id: undefined, data: "b" },
        ]);
    });

    it("skips comments, event / retry fields, empty messages and an unterminated tail", async () => {
        expect(await collect(": heartbeat\n\nevent: x\nretry: 10\ndata\n\nid: 7\n\ndata: tail")).toEqual([
            { id: undefined, data: "" },
        ]);
    });

    it("keeps only the space right after the colon", async () => {
        expect(await collect("data:  two\ndata:none\n\n")).toEqual([{ id: undefined, data: " two\nnone" }]);
    });
});
