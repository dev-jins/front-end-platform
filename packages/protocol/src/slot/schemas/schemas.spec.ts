import { clone, docExamples } from "../../../tests/doc-examples";
import { gameStateSchema } from "./game-state.schema";
import { initResponseSchema } from "./init-response.schema";
import { standardActionResponseSchema } from "./standard-action-response.schema";

const [initExample] = docExamples("Game init request") as [Record<string, unknown>];
const [, spinResponse] = docExamples("Spin request");
const [freespinState, jackpotStep] = docExamples("Game state");

describe("initResponseSchema", () => {
    it("parses the doc example and normalizes bets to strings", () => {
        const init = initResponseSchema.parse(initExample);
        expect(init.bets).toEqual(["10", "25", "50", "100", "1000"]);
        expect(init.socials).toEqual({ needToRequestNickname: false });
        expect(init.bonusParameters?.["2"]).toEqual({ symbol: "sym6", freespins: 10, multiplier: 2 });
    });

    it("accepts numeric-string bets", () => {
        const init = initResponseSchema.parse({ ...clone(initExample), bets: ["0.1", 1] });
        expect(init.bets).toEqual(["0.1", "1"]);
    });

    it("accepts an init error reported inside the 200 payload, without tournament fields", () => {
        const example = clone(initExample);
        delete example.tournaments;
        delete example.tournamentStartPopup;
        delete example.tournamentWinnerPopup;
        const init = initResponseSchema.parse({
            ...example,
            errorCode: 300,
            errorLevel: "WARNING",
            errorMessage: "This language is not supported",
        });
        expect(init.errorCode).toBe(300);
        expect(init.tournaments).toBeUndefined();
    });

    it("accepts a demo session (no user) with a nickname socials shape", () => {
        const init = initResponseSchema.parse({
            ...clone(initExample),
            user: null,
            socials: { nickname: "player_one" },
        });
        expect(init.user).toBeNull();
        expect(init.socials).toEqual({ nickname: "player_one" });
    });

    it("rejects money sent as a number", () => {
        const example = clone(initExample);
        (example.balance as Record<string, unknown>).amount = 10300;
        expect(initResponseSchema.safeParse(example).success).toBe(false);
    });

    it("leaves lastSpin for the adapter, which the standard state schema can parse", () => {
        const init = initResponseSchema.parse(initExample);
        const state = gameStateSchema.parse(init.lastSpin);
        expect(state.extra).toEqual([]);
        expect(state.nextStep).toBe("spin");
    });
});

describe("standardActionResponseSchema", () => {
    it("parses the spin response", () => {
        const response = standardActionResponseSchema.parse(spinResponse);
        expect(response.winLines[0]).toMatchObject({ number: 2, win: "50", direction: "normal" });
        expect(response.balance.amount).toBe("10250");
    });

    it("parses a freespin state with an extra object", () => {
        const response = standardActionResponseSchema.parse(freespinState);
        expect(response.mode).toBe("freespin");
        expect(response.extra).toMatchObject({ freespins: 10, reelsWithSpecials: [0, 1, 2] });
    });

    it("parses a jackpot step with all optional blocks", () => {
        const response = standardActionResponseSchema.parse(jackpotStep);
        expect(response.jackpot).toEqual({ win: "1000", type: "grand" });
        expect(response.wheelOfFortune?.winSector).toBe(3);
        expect(response.jackpotState?.closedItems).toHaveLength(2);
        expect(response.typeMath).toBe("new");
    });

    it("rejects an unknown nextStep", () => {
        expect(
            standardActionResponseSchema.safeParse({ ...clone(spinResponse as object), nextStep: "dance" }).success
        ).toBe(false);
    });
});
