import { createSlotSession, standardStateAdapter } from "@fep/game-core/slot";
import { act, render, screen } from "@testing-library/react";

import { createMockTransport } from "../dev/mock-transport";
import App from "./app";

describe("App", () => {
    it("renders the HUD for the mock session", async () => {
        const transport = createMockTransport();
        const session = createSlotSession({
            sessionKey: "mock",
            createTransport: () => transport,
            adapter: standardStateAdapter,
        });
        render(<App session={session} />);
        await act(() => session.start());
        expect(screen.getByText("$10,000")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Spin" })).toBeTruthy();
    });
});
