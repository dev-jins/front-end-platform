import type { CurvePoint } from "../types/curve-point.type";

// The curve as drawn this round, whatever the source (formula or ticks): one kept point per `minStepMs`, plus a head
// point that follows every frame so the tip is exact without the list growing at frame rate.

export class CurveTrace {
    points: CurvePoint[] = [];
    private headIsProvisional = false;

    constructor(private readonly minStepMs = 50) {}

    add(t: number, m: number): void {
        if (this.headIsProvisional) this.points.pop();
        const anchor = this.points.at(-1);
        this.headIsProvisional = anchor !== undefined && t - anchor.t < this.minStepMs;
        this.points.push({ t, m });
    }

    reset(): void {
        this.points = [];
        this.headIsProvisional = false;
    }

    /** First point at or above `multiplier`, e.g. where the player cashed out. Null if the curve never got there. */
    pointAt(multiplier: number): CurvePoint | null {
        return this.points.find((point) => point.m >= multiplier) ?? null;
    }
}
