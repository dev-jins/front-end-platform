import type { CurvePoint } from "../types/curve-point.type";
import type { CurveViewport } from "../types/curve-viewport.type";

/**
 * Auto-zoom: starts at `minTime` × `minMultiplier` and grows with headroom so the head of the curve stays inside, at
 * about 80% of each axis.
 */
export function curveViewport(points: readonly CurvePoint[], minTime = 8000, minMultiplier = 2): CurveViewport {
    const head = points.at(-1);
    if (!head) return { maxTime: minTime, maxMultiplier: minMultiplier };
    return {
        maxTime: Math.max(minTime, head.t * 1.25),
        maxMultiplier: Math.max(minMultiplier, 1 + (head.m - 1) * 1.25),
    };
}
