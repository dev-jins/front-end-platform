import type { GameState, Slot } from "@fep/protocol/slot";
import { Container, Graphics, Text, type Ticker } from "pixi.js";

import type { SpinView } from "../store/types/spin-view.type";
import { ReelSetMotion } from "./reel-motion";
import { reelColumns, winLineCells } from "./win-lines";

export interface SlotSceneOptions {
    /** `init.slot.params`: reel sizes, symbols, paylines. */
    params: Slot["params"];
    ticker: Ticker;
    cellWidth?: number;
    cellHeight?: number;
    /** How long win lines stay on screen before `present` resolves. */
    winHoldMs?: number;
    random?: () => number;
}

export interface SlotScene extends SpinView {
    /** Add to the stage; local size is `width` × `height`. */
    view: Container;
    width: number;
    height: number;
    /** Shows a state at rest (init `lastSpin`). */
    show(state: GameState): void;
    /** Lands the reels on `state`, shows its win lines; resolves when done. Use as the session's `present`. */
    present(state: GameState): Promise<void>;
    destroy(): void;
}

// ponytail: placeholder symbols (colored tile + name). Replace with TexturePacker atlases per game.
const PALETTE = [0x3b82f6, 0x10b981, 0xf59e0b, 0xef4444, 0x8b5cf6, 0x06b6d4, 0xec4899, 0x84cc16, 0xf97316, 0x64748b];
const SPECIAL_COLOR = 0xeab308;

class SymbolCell extends Container {
    private readonly tile = new Graphics();
    private readonly caption = new Text({
        text: "",
        style: { fill: 0xffffff, fontSize: 22, fontFamily: "sans-serif" },
    });
    private symbol = "";

    constructor(
        private readonly width_: number,
        private readonly height_: number,
        private readonly colorOf: (symbol: string) => number
    ) {
        super();
        this.caption.anchor.set(0.5);
        this.caption.position.set(width_ / 2, height_ / 2);
        this.addChild(this.tile, this.caption);
    }

    setSymbol(symbol: string): void {
        if (symbol === this.symbol) return;
        this.symbol = symbol;
        this.tile
            .clear()
            .roundRect(6, 6, this.width_ - 12, this.height_ - 12, 14)
            .fill({ color: this.colorOf(symbol) });
        this.caption.text = symbol;
    }
}

export function createSlotScene({
    params,
    ticker,
    cellWidth = 120,
    cellHeight = 120,
    winHoldMs = 900,
    random,
}: SlotSceneOptions): SlotScene {
    const reelsSizes = params.reelsSizes ?? [];
    const symbols = params.symbols ?? [];
    const paylines = params.lines ?? [];
    const names = symbols.map((s) => s.name);
    const special = new Set(symbols.filter((s) => s.isWild || s.isScatter).map((s) => s.name));
    const colorOf = (name: string) =>
        special.has(name) ? SPECIAL_COLOR : (PALETTE[Math.max(0, names.indexOf(name)) % PALETTE.length] as number);

    const rows = Math.max(...reelsSizes, 1);
    const width = reelsSizes.length * cellWidth;
    const height = rows * cellHeight;
    const motion = new ReelSetMotion({ reelsSizes, symbols: names, random });

    const view = new Container();
    const reelsLayer = new Container();
    const mask = new Graphics().rect(0, 0, width, height).fill({ color: 0xffffff });
    reelsLayer.mask = mask;
    const winLayer = new Graphics();
    view.addChild(new Graphics().rect(0, 0, width, height).fill({ color: 0x111827 }), reelsLayer, mask, winLayer);

    // One cell per strip row (visible rows + buffer above), per reel.
    const cells = motion.reels.map((reel, i) => {
        const column = new Container();
        column.x = i * cellWidth;
        reelsLayer.addChild(column);
        return reel.strip.map(() => column.addChild(new SymbolCell(cellWidth, cellHeight, colorOf)));
    });

    function draw(): void {
        motion.reels.forEach((reel, i) => {
            reel.strip.forEach((symbol, row) => {
                const cell = cells[i]?.[row];
                if (!cell) return;
                cell.setSymbol(symbol);
                cell.y = (row - 1 + reel.offset) * cellHeight;
            });
        });
    }

    function showWins(state: GameState): void {
        winLayer.clear();
        for (const line of state.winLines) {
            const points = winLineCells(line, paylines, reelsSizes.length).map(({ reel, row }) => ({
                x: (reel + 0.5) * cellWidth,
                y: (row + 0.5) * cellHeight,
            }));
            const [first, ...rest] = points;
            if (!first) continue;
            for (const { x, y } of points) {
                winLayer.roundRect(x - cellWidth / 2 + 4, y - cellHeight / 2 + 4, cellWidth - 8, cellHeight - 8, 16);
            }
            winLayer.stroke({ width: 4, color: 0xfde047 });
            winLayer.moveTo(first.x, first.y);
            for (const { x, y } of rest) winLayer.lineTo(x, y);
            winLayer.stroke({ width: 6, color: 0xfde047, alpha: 0.8 });
        }
    }

    const tick = (t: Ticker) => {
        motion.update(t.deltaMS);
        draw();
    };
    ticker.add(tick);
    draw();

    return {
        view,
        width,
        height,

        show(state) {
            motion.set(reelColumns(state.reels));
            showWins(state);
            draw();
        },

        startSpin() {
            winLayer.clear();
            motion.start();
        },

        stopOn(columns) {
            return motion.stop(columns);
        },

        async present(state) {
            if (!motion.spinning) motion.start();
            await motion.stop(reelColumns(state.reels));
            showWins(state);
            if (state.winLines.length > 0) await new Promise((resolve) => setTimeout(resolve, winHoldMs));
        },

        destroy() {
            ticker.remove(tick);
            view.destroy({ children: true });
        },
    };
}
