import type { GameState, Slot } from "@fep/protocol/slot";

/** 0-based reel (column) and row. */
export interface Cell {
    reel: number;
    row: number;
}

type Payline = NonNullable<Slot["params"]["lines"]>[number];

/**
 * Cells of a winning line. The API's payline `positions` are 1-based rows; `direction` says whether the match
 * counts from the left (`normal`) or the right (`reverse`). Unknown payline → no cells.
 */
export function winLineCells(
    line: Pick<GameState["winLines"][number], "number" | "length" | "direction">,
    paylines: readonly Payline[],
    reelCount: number
): Cell[] {
    const payline = paylines.find((p) => p.number === line.number);
    if (!payline) return [];
    const firstReel = line.direction === "normal" ? 0 : reelCount - line.length;
    return Array.from({ length: line.length }, (_, i) => {
        const reel = firstReel + i;
        return { reel, row: (payline.positions[reel] ?? 1) - 1 };
    });
}

/** `state.reels` as columns of symbol names, left to right (sorted by 1-based reel `number`). */
export function reelColumns(reels: GameState["reels"]): string[][] {
    return [...reels].sort((a, b) => a.number - b.number).map((reel) => reel.symbols);
}
