import { GameApiError } from "@fep/protocol";

import { toCrashSessionError } from "./to-crash-session-error";

describe("toCrashSessionError", () => {
    it("keeps business errors as they are", () => {
        const error = new GameApiError(422, { kind: "business", code: 109, level: "CRITICAL", message: "closed" });
        expect(toCrashSessionError(error)).toEqual({ code: 109, level: "CRITICAL", message: "closed" });
    });

    it("downgrades failures without an API code to ALERT", () => {
        expect(toCrashSessionError(new TypeError("Failed to fetch"))).toEqual({
            code: null,
            level: "ALERT",
            message: "Failed to fetch",
        });
    });
});
