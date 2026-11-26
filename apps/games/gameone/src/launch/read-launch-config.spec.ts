import { readLaunchConfig } from "./read-launch-config";

const API = "https://api.example.com";

describe("readLaunchConfig", () => {
    it("sessionKey → Game API, in any build", () => {
        expect(readLaunchConfig("?sessionKey=abc", API, false)).toEqual({ apiUrl: API, sessionKey: "abc" });
        expect(readLaunchConfig("?sessionKey=abc", API, true)).toEqual({ apiUrl: API, sessionKey: "abc" });
    });

    it("no sessionKey → mock in dev, an error in production", () => {
        expect(readLaunchConfig("", API, true)).toBeNull();
        expect(readLaunchConfig("", undefined, true)).toBeNull();
        expect(() => readLaunchConfig("", API, false)).toThrow("open the game from the lobby");
    });

    it("throws when a sessionKey has no VITE_API_URL", () => {
        expect(() => readLaunchConfig("?sessionKey=abc", undefined, true)).toThrow("VITE_API_URL");
        expect(() => readLaunchConfig("?sessionKey=abc", undefined, false)).toThrow("VITE_API_URL");
    });
});
