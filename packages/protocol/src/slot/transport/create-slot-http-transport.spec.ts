import { docExamples } from "../../../tests/doc-examples";
import { ERROR_CODE } from "../../common/config/error-code";
import { GameApiError } from "../../common/errors/game-api-error";
import { createSlotHttpTransport } from "./create-slot-http-transport";

const [initExample] = docExamples("Game init request");
const [spinRequest, spinResponse] = docExamples("Spin request");
const [tournamentsExample] = docExamples("Tournaments request");

const SESSION_KEY = "$2y$10$abc/def";
const GAME_URL = "https://api.example.com/api/v1/game/%242y%2410%24abc%2Fdef";

function fakeFetch(status: number, body: unknown) {
    const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
    return vi.fn<typeof fetch>(async () => new Response(text || null, { status }));
}

function setup(status: number, body: unknown) {
    const fetch = fakeFetch(status, body);
    const transport = createSlotHttpTransport({ baseUrl: "https://api.example.com/", sessionKey: SESSION_KEY, fetch });
    return { fetch, transport };
}

const errorOf = (promise: Promise<unknown>) =>
    promise.then(
        () => expect.fail("expected rejection"),
        (e) => e
    );

describe("createSlotHttpTransport", () => {
    it("init: GETs the percent-encoded session url and parses the response", async () => {
        const { fetch, transport } = setup(200, initExample);
        const init = await transport.init();
        expect(fetch).toHaveBeenCalledWith(GAME_URL, expect.objectContaining({ method: "GET", body: undefined }));
        expect(init.fingerprint).toBe("ZmluZ2VycHJpbnQwMDAwMDAwMDAwMDAwMDAwMDAwMDAw");
    });

    it("action: POSTs the JSON body and returns the raw response", async () => {
        const { fetch, transport } = setup(200, spinResponse);
        const body = spinRequest as { bet: number; lines: number; fingerprint: string };
        await expect(transport.action("spin", body)).resolves.toEqual(spinResponse);

        const [url, init] = fetch.mock.calls[0] ?? [];
        expect(url).toBe(`${GAME_URL}/spin`);
        expect(init?.method).toBe("POST");
        expect(JSON.parse(init?.body as string)).toEqual(spinRequest);
        expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
    });

    it("tournaments: GETs and parses", async () => {
        const { fetch, transport } = setup(200, tournamentsExample);
        const { tournaments } = await transport.tournaments();
        expect(fetch.mock.calls[0]?.[0]).toBe(`${GAME_URL}/tournaments`);
        expect(tournaments).toHaveLength(1);
    });

    it("stat: resolves on an empty 200 body", async () => {
        const { fetch, transport } = setup(200, undefined);
        await expect(transport.stat("loaded")).resolves.toBeUndefined();
        expect(fetch.mock.calls[0]?.[0]).toBe(`${GAME_URL}/stat/loaded`);
    });

    it("throws a business GameApiError on 422", async () => {
        const { transport } = setup(422, {
            errorCode: 112,
            errorLevel: "ALERT",
            errorMessage: "Game already opened in other device",
        });
        const error = await errorOf(transport.action("freespin", { fingerprint: "stale" }));
        expect(error).toBeInstanceOf(GameApiError);
        expect(error.detail).toMatchObject({ kind: "business", code: ERROR_CODE.openedOnOtherDevice, level: "ALERT" });
    });

    it("keeps a non-JSON error body as text", async () => {
        const { transport } = setup(502, "<html>Bad gateway</html>");
        const error = await errorOf(transport.init());
        expect(error.detail).toEqual({ kind: "unexpected", body: "<html>Bad gateway</html>" });
    });

    it("uses the global fetch by default", async () => {
        const fetch = fakeFetch(200, undefined);
        vi.stubGlobal("fetch", fetch);
        try {
            await createSlotHttpTransport({ baseUrl: "https://api.example.com", sessionKey: "k" }).stat("loaded");
            expect(fetch).toHaveBeenCalledOnce();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
