import { reelColumns, winLineCells } from "./win-lines";

// Paylines from the API doc's init example.
const PAYLINES = [
    { number: 2, positions: [1, 1, 1, 1, 1] },
    { number: 6, positions: [1, 2, 3, 2, 1] },
];

describe("winLineCells", () => {
    it("maps a left-to-right win to 0-based cells", () => {
        expect(winLineCells({ number: 6, length: 3, direction: "normal" }, PAYLINES, 5)).toEqual([
            { reel: 0, row: 0 },
            { reel: 1, row: 1 },
            { reel: 2, row: 2 },
        ]);
    });

    it("counts a reverse win from the right", () => {
        expect(winLineCells({ number: 6, length: 2, direction: "reverse" }, PAYLINES, 5)).toEqual([
            { reel: 3, row: 1 },
            { reel: 4, row: 0 },
        ]);
    });

    it("returns no cells for an unknown payline", () => {
        expect(winLineCells({ number: 99, length: 3, direction: "normal" }, PAYLINES, 5)).toEqual([]);
    });
});

describe("reelColumns", () => {
    it("orders reels by their 1-based number", () => {
        expect(
            reelColumns([
                { number: 2, symbols: ["c", "d"] },
                { number: 1, symbols: ["a", "b"] },
            ])
        ).toEqual([
            ["a", "b"],
            ["c", "d"],
        ]);
    });
});
