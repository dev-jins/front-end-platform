import { GameApiError } from "@fep/protocol";
import type { GameState, InitResponse, SlotTransport } from "@fep/protocol/slot";

// Dev-only stand-in for the Game API so the client runs without a backend. Values follow the API doc's init example.
// ponytail: base-game spins only (no freespins/bonus); add scripted rounds when a feature needs to be seen.

const SYMBOLS = ["sym1", "sym2", "sym3", "sym4", "sym5", "sym6", "sym7", "sym8", "wild", "scatter"];
const LINES = [
    [2, 2, 2, 2, 2],
    [1, 1, 1, 1, 1],
    [3, 3, 3, 3, 3],
    [1, 2, 2, 2, 1],
    [3, 2, 2, 2, 3],
    [1, 2, 3, 2, 1],
    [3, 2, 1, 2, 3],
    [2, 1, 1, 1, 2],
    [2, 3, 3, 3, 2],
    [2, 1, 2, 3, 2],
];

const randomSymbol = () => SYMBOLS[Math.floor(Math.random() * 8)] as string; // no wild/scatter filler
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function baseState(reels: string[][], bet: string, totalWin: string, winLines: GameState["winLines"]): GameState {
    return {
        reels: reels.map((symbols, i) => ({ number: i + 1, symbols })),
        bet,
        lines: 10,
        totalBet: String(Number(bet) * 10),
        totalWin,
        winLines,
        mode: "spin",
        currentStep: "spin",
        nextStep: "spin",
        extra: [],
        multiplier: 1,
        collectedSymbol: null,
        collection: [],
    };
}

export function createMockTransport(): SlotTransport {
    let balance = 10_000;
    let spins = 0;
    const balanceOf = () => ({ sessionKey: "mock", currency: "USD", amount: String(balance) });

    const init: InitResponse = {
        user: null,
        fingerprint: "mock-fingerprint",
        sessionKey: "mock",
        locale: "en",
        translationsUrl: "",
        fallbackTranslationsUrl: "",
        bets: ["10", "25", "50", "100"],
        bonusCoefficient: 100,
        lines: 10,
        mode: "spin",
        lastSpin: baseState(
            Array.from({ length: 5 }, () => [randomSymbol(), randomSymbol(), randomSymbol()]),
            "10",
            "0",
            []
        ),
        slot: {
            id: 101,
            name: "Game One",
            systemName: "gameone",
            isActive: true,
            createdAt: "2025-10-01T10:00:00+00:00",
            updatedAt: "2026-05-14T09:12:00+00:00",
            params: {
                enableSecondBet: true,
                info: { rtp: "95.50", maxWinMultiplier: 1000, jackpot: [] },
                reelsSizes: [3, 3, 3, 3, 3],
                reelsCount: 5,
                linesCount: 10,
                symbolsCount: SYMBOLS.length,
                lines: LINES.map((positions, i) => ({ number: i + 1, positions })),
                symbols: SYMBOLS.map((name) => ({
                    isJackpot: false,
                    isScatter: name === "scatter",
                    isWild: name === "wild",
                    name,
                    wins: [0, 0, 5, 25, 100],
                })),
                bigwin: null,
            },
        },
        homeUrl: null,
        balance: balanceOf(),
        currency: "USD",
        currencyMultiplier: 1,
        clientSettings: null,
        externalFreespins: null,
        socials: { needToRequestNickname: false },
        operatorData: {
            hasLobby: false,
            clientSettings: null,
            showHomeButton: false,
            hasSlowMode: false,
            hasCollections: false,
        },
        currencyData: { currency: "USD", multiplier: 1, rounding: 0, iconUrl: "", iconBorderUrl: "" },
        tournaments: [],
        tournamentStartPopup: null,
        tournamentWinnerPopup: null,
    };

    return {
        async init() {
            await delay(200);
            return structuredClone(init);
        },

        async action(endpoint, body) {
            await delay(150);
            if (endpoint !== "spin" || !("bet" in body)) {
                throw new Error(`Mock transport: ${endpoint} is not scripted`);
            }
            const bet = String(body.bet);
            const totalBet = Number(bet) * 10;
            if (totalBet > balance) {
                throw new GameApiError(422, { kind: "business", code: 3, level: "ALERT", message: "Not enough money" });
            }

            spins++;
            const reels = Array.from({ length: 5 }, () => [randomSymbol(), randomSymbol(), randomSymbol()]);
            let winLines: GameState["winLines"] = [];
            if (spins % 3 === 0) {
                // Every third spin: three sym3 on payline 6 (V shape), left to right.
                LINES[5]?.slice(0, 3).forEach((row, reel) => {
                    (reels[reel] as string[])[row - 1] = "sym3";
                });
                winLines = [
                    { number: 6, symbol: "sym3", win: String(Number(bet) * 5), length: 3, direction: "normal" },
                ];
            }
            const win = winLines.reduce((sum, line) => sum + Number(line.win), 0);
            balance += win - totalBet;

            return {
                ...baseState(reels, bet, String(win), winLines),
                balance: balanceOf(),
                externalFreespins: null,
                tournamentStartPopup: null,
                tournamentWinnerPopup: null,
            };
        },

        async tournaments() {
            return { tournaments: [] };
        },

        async stat() {
            return undefined;
        },
    };
}
