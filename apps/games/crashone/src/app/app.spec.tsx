import { createCrashSession } from "@fep/game-core/crash";
import { act, render, screen } from "@testing-library/react";

import { createDevCrashTransport } from "../dev/create-dev-crash-transport";
import App from "./app";

describe("App", () => {
    it("renders the crash HUD for the dev session", async () => {
        const session = createCrashSession({ transport: createDevCrashTransport() });
        render(<App session={session} />);
        await act(() => session.start());
        expect(screen.getByText("$1,000.00")).toBeTruthy();
        session.stop();
    });
});
