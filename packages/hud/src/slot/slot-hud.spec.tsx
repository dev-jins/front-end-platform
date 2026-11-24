import { createSlotSession, standardStateAdapter } from "@fep/game-core/slot";
import { GameApiError } from "@fep/protocol";
import { initResponseSchema, type SlotTransport } from "@fep/protocol/slot";
import { docExamples } from "@fep/protocol/testing";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { SlotHud } from "./slot-hud";

type Raw = Record<string, unknown>;
const [initExample] = docExamples("Game init request") as [Raw];
const [, spinExample] = docExamples("Spin request") as [unknown, Raw];

/** Doc init example (USD, rounding 0, bets 10…1000, 10 lines), without popups unless given. */
function setup({ init = {}, actions = [spinExample] }: { init?: Raw; actions?: unknown[] } = {}) {
    const queue = [...actions];
    const transport: SlotTransport = {
        init: async () =>
            initResponseSchema.parse({
                ...structuredClone(initExample),
                tournamentStartPopup: null,
                tournamentWinnerPopup: null,
                ...init,
            }),
        action: vi.fn(async () => {
            const next = queue.shift();
            if (next instanceof Error) throw next;
            return structuredClone(next);
        }),
        tournaments: async () => ({ tournaments: [] }),
        stat: async () => undefined,
    };
    const session = createSlotSession({
        sessionKey: "k",
        createTransport: () => transport,
        adapter: standardStateAdapter,
    });
    return { session, transport };
}

async function renderStarted(
    options?: Parameters<typeof setup>[0],
    props: { buyFeature?: boolean; onReload?: () => void } = {}
) {
    const { session, transport } = setup(options);
    render(<SlotHud session={session} {...props} />);
    await act(() => session.start());
    return { session, transport };
}

const click = (name: string | RegExp) => act(async () => void fireEvent.click(screen.getByRole("button", { name })));

describe("SlotHud", () => {
    it("shows loading until init lands", () => {
        const { session } = setup();
        render(<SlotHud session={session} />);
        expect(screen.getByText("Loading…")).toBeTruthy();
    });

    it("shows balance and total bet formatted with the session currency", async () => {
        await renderStarted();
        expect(screen.getByText("$10,300")).toBeTruthy();
        expect(screen.getByText("$100")).toBeTruthy(); // bet 10 × 10 lines
    });

    it("steps through the allowed bets", async () => {
        await renderStarted();
        expect((screen.getByRole("button", { name: "Decrease bet" }) as HTMLButtonElement).disabled).toBe(true);
        await click("Increase bet");
        expect(screen.getByText("$250")).toBeTruthy();
        await click("Decrease bet");
        expect(screen.getByText("$100")).toBeTruthy();
    });

    it("spins with the selected bet and shows the committed win", async () => {
        const { transport } = await renderStarted();
        await click("Increase bet");
        await click("Spin");
        expect(transport.action).toHaveBeenCalledWith("spin", expect.objectContaining({ bet: "25", lines: 10 }));
        expect(screen.getByText("$10,250")).toBeTruthy();
        expect(screen.getByText("$50")).toBeTruthy();
    });

    it("shows Buy bonus only when the game sells it, priced from bonusCoefficient", async () => {
        await renderStarted();
        expect(screen.queryByRole("button", { name: /Buy bonus/ })).toBeNull();
    });

    it("buys with the selected bet", async () => {
        const { transport } = await renderStarted({ init: { bonusCoefficient: 150 } }, { buyFeature: true });
        await click("Buy bonus $150");
        expect(transport.action).toHaveBeenCalledWith("buy", expect.objectContaining({ bet: "10" }));
    });

    it("ALERT: dialog with OK, controls locked until closed", async () => {
        await renderStarted({
            actions: [
                new GameApiError(422, { kind: "business", code: 3, level: "ALERT", message: "Not enough money" }),
            ],
        });
        await click("Spin");
        expect(screen.getByRole("alertdialog", { name: "Notice" }).textContent).toContain("Not enough money");
        expect((screen.getByRole("button", { name: "Spin" }) as HTMLButtonElement).disabled).toBe(true);
        await click("OK");
        expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("CRITICAL: session over with reload only", async () => {
        const onReload = vi.fn();
        await renderStarted(
            { actions: [new GameApiError(422, { kind: "business", code: 109, level: "CRITICAL", message: "" })] },
            { onReload }
        );
        await click("Spin");
        expect(screen.getByRole("alertdialog", { name: "Session over" }).textContent).toContain(
            "Something went wrong."
        );
        expect(screen.queryByRole("button", { name: "OK" })).toBeNull();
        await click("Reload");
        expect(onReload).toHaveBeenCalledOnce();
    });

    it("shows tournament popups one after another", async () => {
        await renderStarted({
            init: {
                tournamentStartPopup: (initExample.tournamentStartPopup as Raw) ?? null,
                tournamentWinnerPopup: {
                    tournamentId: 6,
                    name: "Last week",
                    currency: "EUR",
                    totalPrizeAmount: "5000",
                    place: 2,
                    prizeAmount: "1500",
                },
            },
        });
        expect(screen.getByRole("alertdialog", { name: "Tournament One" }).textContent).toContain(
            "Prize pool €5,000.00"
        );
        await click("OK");
        expect(screen.getByRole("alertdialog", { name: "Last week" }).textContent).toContain(
            "You placed #2 and won €1,500.00"
        );
        await click("OK");
        expect(screen.queryByRole("alertdialog")).toBeNull();
    });
});
