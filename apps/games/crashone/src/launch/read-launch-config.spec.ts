import { readLaunchConfig } from "./read-launch-config";

const env = { VITE_GATEWAY_URL: "https://gw.example.com", VITE_API_URL: "https://api.example.com" };

describe("readLaunchConfig", () => {
    it("launchToken → gateway, from env; ?gatewayUrl= overrides it only in dev", () => {
        expect(readLaunchConfig("?launchToken=lt", env, false)).toEqual({
            transport: "gateway",
            gatewayUrl: "https://gw.example.com",
            launchToken: "lt",
        });
        expect(readLaunchConfig("?launchToken=lt&gatewayUrl=https://other", env, true)).toMatchObject({
            gatewayUrl: "https://other",
        });
        expect(readLaunchConfig("?launchToken=lt&gatewayUrl=https://attacker", env, false)).toMatchObject({
            gatewayUrl: "https://gw.example.com",
        });
        expect(() => readLaunchConfig("?launchToken=lt&gatewayUrl=https://attacker", {}, false)).toThrow(
            "VITE_GATEWAY_URL"
        );
    });

    it("sessionKey → Provider A direct, demo flag", () => {
        expect(readLaunchConfig("?sessionKey=abc&demo=1", env, false)).toEqual({
            transport: "direct",
            apiUrl: "https://api.example.com",
            sessionKey: "abc",
            demo: true,
        });
        expect(readLaunchConfig("?sessionKey=abc", env, false)).toMatchObject({ demo: false });
    });

    it("no launch params → mock in dev, an error in production", () => {
        expect(readLaunchConfig("", env, true)).toEqual({ transport: "mock" });
        expect(() => readLaunchConfig("", env, false)).toThrow("open the game from the lobby");
    });

    it("throws when the mode's URL is missing", () => {
        expect(() => readLaunchConfig("?launchToken=lt", {}, true)).toThrow("VITE_GATEWAY_URL");
        expect(() => readLaunchConfig("?sessionKey=abc", {}, true)).toThrow("VITE_API_URL");
    });
});
