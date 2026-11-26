import { createTransport } from "./create-transport";

describe("createTransport", () => {
    it.each([
        { transport: "gateway", gatewayUrl: "https://gw.example.com", launchToken: "lt" },
        { transport: "direct", apiUrl: "https://api.example.com", sessionKey: "abc", demo: false },
        { transport: "mock" },
    ] as const)("creates a $transport transport", (config) => {
        const transport = createTransport(config);
        expect(typeof transport.init).toBe("function");
        expect(typeof transport.play).toBe("function");
        expect(typeof transport.subscribe).toBe("function");
    });

    it("the mock answers init without a network", async () => {
        await expect(createTransport({ transport: "mock" }).init()).resolves.toMatchObject({
            game: { family: "crash", clientId: "crashone" },
        });
    });
});
