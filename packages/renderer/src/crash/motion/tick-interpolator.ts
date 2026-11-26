// Ticks-only providers: the multiplier arrives at network rate and jitters. Draw it one tick behind, easing from the
// previous tick to the latest over the gap that separated them, so the curve is smooth and never shows a value the
// server has not sent yet.

export class TickInterpolator {
    private previous: { value: number; at: number } | null = null;
    private latest: { value: number; at: number } | null = null;

    push(value: number, at: number): void {
        this.previous = this.latest;
        this.latest = { value, at };
    }

    reset(): void {
        this.previous = null;
        this.latest = null;
    }

    /** null before the first tick. */
    valueAt(now: number): number | null {
        const previous = this.previous;
        const latest = this.latest;
        if (!latest) return null;
        if (!previous) return latest.value;
        const gap = latest.at - previous.at;
        const progress = gap <= 0 ? 1 : Math.min(1, Math.max(0, (now - latest.at) / gap));
        return previous.value + (latest.value - previous.value) * progress;
    }
}
