// Reel motion without Pixi: what each reel shows and where, advanced by `update(dtMs)`.
// The scene draws `strip` at `offset` every frame; nothing here depends on rendering.

export interface ReelMotionOptions {
    /** Visible rows. */
    rows: number;
    /** Symbol names used as filler while spinning. */
    symbols: readonly string[];
    random?: () => number;
    /** Full speed, in symbols per second. */
    speed?: number;
    /** Time to reach full speed. */
    accelerationMs?: number;
}

type ReelPhase = "idle" | "spinning" | "stopping";

export class ReelMotion {
    /** `strip[0]` is the buffer row above the window, `strip[1..rows]` are visible, top to bottom. */
    strip: string[];
    /** Scroll in symbol heights, `0 ≤ offset < 1`. Row `i` is drawn at `(i - 1 + offset) * symbolHeight`. */
    offset = 0;
    phase: ReelPhase = "idle";

    private readonly rows: number;
    private readonly symbols: readonly string[];
    private readonly random: () => number;
    private readonly speed: number;
    private readonly accelerationMs: number;
    private velocity = 0;
    /** Final symbols still to enter from the top, bottom row first. */
    private queue: string[] = [];
    private landed: Promise<void> = Promise.resolve();
    private resolveLanded: () => void = () => undefined;

    constructor({ rows, symbols, random = Math.random, speed = 18, accelerationMs = 150 }: ReelMotionOptions) {
        if (symbols.length === 0) throw new Error("ReelMotion needs at least one symbol");
        this.rows = rows;
        this.symbols = symbols;
        this.random = random;
        this.speed = speed;
        this.accelerationMs = accelerationMs;
        this.strip = Array.from({ length: rows + 1 }, () => this.filler());
    }

    /** Shows `column` (top to bottom) at rest, without animation. */
    set(column: readonly string[]): void {
        this.assertColumn(column);
        this.strip = [this.filler(), ...column];
        this.offset = 0;
        this.velocity = 0;
        this.queue = [];
        this.phase = "idle";
        this.resolveLanded();
    }

    start(): void {
        if (this.phase === "idle") this.phase = "spinning";
    }

    /** Lands on `column` (top to bottom) after it scrolls in; resolves once at rest. Starts the reel if idle. */
    stop(column: readonly string[]): Promise<void> {
        if (this.phase === "stopping") return this.landed;
        this.assertColumn(column);
        this.queue = [...column].reverse();
        this.phase = "stopping";
        this.landed = new Promise((resolve) => (this.resolveLanded = resolve));
        return this.landed;
    }

    update(dtMs: number): void {
        if (this.phase === "idle") return;
        this.velocity = Math.min(this.speed, this.velocity + (this.speed * dtMs) / this.accelerationMs);
        this.offset += (this.velocity * dtMs) / 1000;

        while (this.offset >= 1) {
            this.offset -= 1;
            this.strip.pop();
            if (this.phase === "stopping" && this.queue.length === 0) {
                // The last final symbol just moved into row 1: the result is fully in the window.
                // ponytail: hard stop at full speed; add a GSAP back-out bounce with the big-win timelines.
                this.strip.unshift(this.filler());
                this.offset = 0;
                this.velocity = 0;
                this.phase = "idle";
                this.resolveLanded();
                return;
            }
            this.strip.unshift(this.phase === "stopping" ? (this.queue.shift() as string) : this.filler());
        }
    }

    private filler(): string {
        return this.symbols[Math.floor(this.random() * this.symbols.length)] as string;
    }

    private assertColumn(column: readonly string[]): void {
        if (column.length !== this.rows) throw new Error(`Expected ${this.rows} symbols, got ${column.length}`);
    }
}

export interface ReelSetMotionOptions extends Omit<ReelMotionOptions, "rows"> {
    /** Visible rows per reel, left to right (`slot.params.reelsSizes`). */
    reelsSizes: readonly number[];
    /** Reels keep spinning at least this long, even when the result arrives sooner. */
    minSpinMs?: number;
    /** Delay between consecutive reels stopping, left to right. */
    stopDelayMs?: number;
}

interface ScheduledStop {
    at: number;
    reel: number;
    column: readonly string[];
    done: () => void;
}

export class ReelSetMotion {
    readonly reels: ReelMotion[];
    private readonly minSpinMs: number;
    private readonly stopDelayMs: number;
    private elapsed = 0;
    private scheduled: ScheduledStop[] = [];

    constructor({ reelsSizes, minSpinMs = 500, stopDelayMs = 150, ...reel }: ReelSetMotionOptions) {
        this.reels = reelsSizes.map((rows) => new ReelMotion({ ...reel, rows }));
        this.minSpinMs = minSpinMs;
        this.stopDelayMs = stopDelayMs;
    }

    get spinning(): boolean {
        return this.reels.some((reel) => reel.phase !== "idle");
    }

    /** Shows `columns` at rest. */
    set(columns: readonly (readonly string[])[]): void {
        this.assertColumns(columns);
        this.scheduled = [];
        columns.forEach((column, i) => {
            this.reels[i]?.set(column);
        });
    }

    start(): void {
        this.elapsed = 0;
        this.scheduled = [];
        for (const reel of this.reels) reel.start();
    }

    /** Stops reels left to right on `columns`; resolves when the last one is at rest. */
    stop(columns: readonly (readonly string[])[]): Promise<void> {
        this.assertColumns(columns);
        const first = Math.max(this.elapsed, this.minSpinMs);
        return Promise.all(
            columns.map(
                (column, reel) =>
                    new Promise<void>((done) =>
                        this.scheduled.push({ at: first + reel * this.stopDelayMs, reel, column, done })
                    )
            )
        ).then(() => undefined);
    }

    update(dtMs: number): void {
        this.elapsed += dtMs;
        const due = this.scheduled.filter((stop) => stop.at <= this.elapsed);
        this.scheduled = this.scheduled.filter((stop) => stop.at > this.elapsed);
        for (const { reel, column, done } of due) void this.reels[reel]?.stop(column).then(done);
        for (const reel of this.reels) reel.update(dtMs);
    }

    private assertColumns(columns: readonly (readonly string[])[]): void {
        if (columns.length !== this.reels.length) {
            throw new Error(`Expected ${this.reels.length} reels, got ${columns.length}`);
        }
    }
}
