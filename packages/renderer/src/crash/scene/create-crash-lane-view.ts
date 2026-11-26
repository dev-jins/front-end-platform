import type { CrashPhase } from "@fep/protocol/crash";
import { Container, Graphics, Text } from "pixi.js";

import { CurveTrace } from "../motion/curve-trace";
import { TickInterpolator } from "../motion/tick-interpolator";
import type { CrashLaneView } from "../types/crash-lane-view.type";
import type { CrashLaneViewOptions } from "../types/crash-lane-view-options.type";
import { curveViewport } from "../utils/curve-viewport";
import { toCrashFrame } from "../utils/to-crash-frame";
import { toScreenPoint } from "../utils/to-screen-point";

// ponytail: placeholder look (line, dot, text). Replace with the game's art (Spine object, particles) per crash game.
const COLORS = { background: 0x111827, grid: 0x1f2937, curve: 0x22c55e, crashed: 0xef4444, cashout: 0xfde047 };
const PADDING = 24;

/**
 * Draws one lane: multiplier curve, object at its tip, big multiplier, countdown, crash and the player's cash-out
 * marker. Reads the store every frame; per-frame logic lives in `toCrashFrame` / `CurveTrace` (unit tested).
 */
export function createCrashLaneView({
    store,
    lane,
    ticker,
    width = 720,
    height = 405,
    now = Date.now,
}: CrashLaneViewOptions): CrashLaneView {
    const plotWidth = width - PADDING * 2;
    const plotHeight = height - PADDING * 2;
    const trace = new CurveTrace();
    const ticks = new TickInterpolator();
    let roundId: string | undefined;

    const view = new Container();
    const plot = new Container();
    plot.position.set(PADDING, PADDING);
    const grid = new Graphics();
    const curve = new Graphics();
    const marker = new Graphics();
    const object = new Graphics().circle(0, 0, 10).fill({ color: 0xffffff });
    const label = new Text({
        text: "",
        style: { fill: 0xffffff, fontSize: 56, fontWeight: "700", fontFamily: "sans-serif" },
    });
    const caption = new Text({ text: "", style: { fill: 0x9ca3af, fontSize: 20, fontFamily: "sans-serif" } });
    label.anchor.set(0.5);
    caption.anchor.set(0.5);
    label.position.set(width / 2, height / 2 - 16);
    caption.position.set(width / 2, height / 2 + 32);
    plot.addChild(grid, curve, marker, object);
    view.addChild(new Graphics().rect(0, 0, width, height).fill({ color: COLORS.background }), plot, label, caption);

    // Ticks are recorded with their arrival time for the ticks-only interpolation.
    const unsubscribe = store.subscribe((state, previous) => {
        const current = state.lanes[lane];
        if (current && current.multiplier !== previous.lanes[lane]?.multiplier)
            ticks.push(Number(current.multiplier), now());
    });

    function draw(): void {
        const { lanes, init, clockOffsetMs } = store.getState();
        const current = lanes[lane];
        const curveKind = init?.capabilities.crash.curve;
        if (!current || !curveKind) {
            label.text = "";
            caption.text = "Connecting…";
            return;
        }
        if (current.roundId !== roundId) {
            roundId = current.roundId;
            trace.reset();
            ticks.reset();
        }

        const frame = toCrashFrame(current, curveKind, now() + (clockOffsetMs ?? 0), ticks.valueAt(now()));
        if (frame.elapsedMs !== null) trace.add(frame.elapsedMs, frame.multiplier);

        const viewport = curveViewport(trace.points);
        const crashed = frame.phase === "crashed";
        const color = crashed ? COLORS.crashed : COLORS.curve;

        grid.clear();
        for (let m = 1; m <= viewport.maxMultiplier; m += Math.max(1, Math.round(viewport.maxMultiplier / 4))) {
            const { y } = toScreenPoint({ t: 0, m }, viewport, plotWidth, plotHeight);
            grid.moveTo(0, y).lineTo(plotWidth, y);
        }
        grid.stroke({ width: 1, color: COLORS.grid });

        curve.clear();
        const points = trace.points.map((point) => toScreenPoint(point, viewport, plotWidth, plotHeight));
        const [first, ...rest] = points;
        if (first) {
            curve.moveTo(first.x, first.y);
            for (const { x, y } of rest) curve.lineTo(x, y);
            curve.stroke({ width: 5, color });
        }
        const tip = points.at(-1);
        object.visible = tip !== undefined && frame.phase === "running";
        if (tip) object.position.set(tip.x, tip.y);

        marker.clear();
        const cashout = current.myBet?.cashout;
        const cashoutPoint = cashout ? trace.pointAt(Number(cashout.multiplier)) : null;
        if (cashoutPoint) {
            const { x, y } = toScreenPoint(cashoutPoint, viewport, plotWidth, plotHeight);
            marker.circle(x, y, 8).fill({ color: COLORS.cashout });
        }

        label.text = frame.phase === "countdown" || frame.phase === "starting" ? "" : `${frame.multiplier.toFixed(2)}x`;
        label.style.fill = crashed ? COLORS.crashed : 0xffffff;
        caption.text = captionFor(frame.phase, frame.countdownMs, cashout?.multiplier);
    }

    const tick = () => draw();
    ticker.add(tick);
    draw();

    return {
        view,
        width,
        height,
        destroy() {
            ticker.remove(tick);
            unsubscribe();
            view.destroy({ children: true });
        },
    };
}

function captionFor(phase: CrashPhase, countdownMs: number | null, cashoutMultiplier: string | undefined): string {
    if (phase === "starting") return "Next round";
    if (phase === "countdown") {
        return countdownMs === null ? "Place your bets" : `Starts in ${(countdownMs / 1000).toFixed(1)}s`;
    }
    if (phase === "crashed") return "Crashed";
    return cashoutMultiplier ? `Cashed out at ${cashoutMultiplier}x` : "";
}
