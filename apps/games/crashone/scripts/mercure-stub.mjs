// Local stand-in for Provider A's Mercure hub, for running crashone against the Postman mock (sessionKey=crash-demo).
// The mock's game init points `server.url` here. Every connection gets the same loop, matching the mock's myStats
// (round 88, running at 1.37): ticks up to CRASH_AT, then a `crash` event (the client resyncs from myStats) and again.
// ponytail: one fixed round and no per-topic routing; replace with a real Mercure hub when the backend runs locally.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 4311);
const ROUND_ID = 88;
const START = 1.37;
const CRASH_AT = 3.1;
const TICK_MS = 100;
const PAUSE_MS = 2000;

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Accept, Last-Event-ID, Cache-Control",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
};

createServer((req, res) => {
    if (req.method === "OPTIONS") return res.writeHead(204, CORS).end();
    if (req.method !== "GET" || !req.url?.startsWith("/.well-known/mercure")) return res.writeHead(404, CORS).end();

    res.writeHead(200, { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    let id = 0;
    let multiplier = START;
    const send = (data) => res.write(`id: ${++id}\ndata: ${JSON.stringify(data)}\n\n`);

    let timer;
    const tick = () => {
        multiplier = Math.round(multiplier * 1.01 * 100) / 100;
        if (multiplier < CRASH_AT) {
            send({ type: "tick", roundId: ROUND_ID, multiplier });
            timer = setTimeout(tick, TICK_MS);
            return;
        }
        send({ type: "crash", roundId: ROUND_ID, multiplier: CRASH_AT });
        multiplier = START;
        timer = setTimeout(tick, PAUSE_MS);
    };
    timer = setTimeout(tick, TICK_MS);
    req.on("close", () => clearTimeout(timer));
}).listen(PORT, () => console.log(`Mercure stub on http://localhost:${PORT}/.well-known/mercure`));
