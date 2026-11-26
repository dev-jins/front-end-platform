import type { CurvePoint } from "../types/curve-point.type";
import type { CurveViewport } from "../types/curve-viewport.type";

/** Curve point → pixels in a `width` × `height` box, origin top-left; multiplier 1 sits on the bottom edge. */
export function toScreenPoint(
    point: CurvePoint,
    viewport: CurveViewport,
    width: number,
    height: number
): { x: number; y: number } {
    return {
        x: (point.t / viewport.maxTime) * width,
        y: height - ((point.m - 1) / (viewport.maxMultiplier - 1)) * height,
    };
}
