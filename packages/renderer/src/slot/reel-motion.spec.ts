import { ReelMotion, ReelSetMotion } from "./reel-motion.js";

const SYMBOLS = ["a", "b", "c", "d"];
const filler = () => 0; // always "a"
const visible = (reel: ReelMotion) => reel.strip.slice(1);

/** Advances in small frames until `done()` or a frame budget runs out. */
function runUntil(update: (dt: number) => void, done: () => boolean, frameMs = 16, maxFrames = 1000): number {
    let frames = 0;
    while (!done() && frames < maxFrames) {
        update(frameMs);
        frames++;
    }
    return frames;
}

describe("ReelMotion", () => {
    it("shows a column at rest", () => {
        const reel = new ReelMotion({ rows: 3, symbols: SYMBOLS, random: filler });
        reel.set(["b", "c", "d"]);
        expect(visible(reel)).toEqual(["b", "c", "d"]);
        reel.update(100);
        expect(reel.offset).toBe(0);
    });

    it("scrolls down while spinning, feeding filler from the top", () => {
        const reel = new ReelMotion({ rows: 3, symbols: SYMBOLS, random: filler, speed: 10, accelerationMs: 1 });
        reel.set(["b", "c", "d"]);
        reel.start();
        reel.update(50); // 0.5 symbol
        expect(reel.offset).toBeCloseTo(0.5);
        reel.update(60); // past one symbol: everything moved down one row
        expect(visible(reel)).toEqual(["a", "b", "c"]);
    });

    it("lands exactly on the final column and resolves", async () => {
        const reel = new ReelMotion({ rows: 3, symbols: SYMBOLS, random: filler, speed: 20 });
        reel.start();
        runUntil(
            (dt) => reel.update(dt),
            () => false,
            16,
            10
        );
        const landed = reel.stop(["b", "c", "d"]);
        expect(reel.stop(["d", "d", "d"])).toBe(landed); // a second stop is ignored

        runUntil(
            (dt) => reel.update(dt),
            () => reel.phase === "idle"
        );
        await landed;
        expect(visible(reel)).toEqual(["b", "c", "d"]);
        expect(reel.offset).toBe(0);
    });

    it("starts by itself when stopped from idle", async () => {
        const reel = new ReelMotion({ rows: 2, symbols: SYMBOLS, random: filler });
        const landed = reel.stop(["c", "d"]);
        runUntil(
            (dt) => reel.update(dt),
            () => reel.phase === "idle"
        );
        await landed;
        expect(visible(reel)).toEqual(["c", "d"]);
    });

    it("rejects a column of the wrong size and an empty symbol set", () => {
        const reel = new ReelMotion({ rows: 3, symbols: SYMBOLS });
        expect(() => reel.stop(["a"])).toThrow("Expected 3 symbols, got 1");
        expect(() => new ReelMotion({ rows: 3, symbols: [] })).toThrow();
    });
});

describe("ReelSetMotion", () => {
    const columns = [
        ["b", "b", "b"],
        ["c", "c"],
        ["d", "d", "d"],
    ];

    it("keeps spinning for minSpinMs, then stops reels left to right", async () => {
        const set = new ReelSetMotion({
            reelsSizes: [3, 2, 3],
            symbols: SYMBOLS,
            random: filler,
            minSpinMs: 300,
            stopDelayMs: 100,
        });
        set.start();
        const landed = set.stop(columns);

        runUntil(
            (dt) => set.update(dt),
            () => false,
            10,
            29
        ); // 290 ms
        expect(set.reels.map((r) => r.phase)).toEqual(["spinning", "spinning", "spinning"]);

        runUntil(
            (dt) => set.update(dt),
            () => set.reels[0]?.phase === "idle"
        );
        expect(set.reels[2]?.phase).not.toBe("idle"); // later reels still moving

        runUntil(
            (dt) => set.update(dt),
            () => !set.spinning
        );
        await landed;
        expect(set.reels.map((r) => r.strip.slice(1))).toEqual(columns);
    });

    it("set() shows columns at rest and cancels pending stops", () => {
        const set = new ReelSetMotion({ reelsSizes: [3, 2, 3], symbols: SYMBOLS, random: filler });
        set.start();
        void set.stop(columns);
        set.set(columns);
        expect(set.spinning).toBe(false);
        set.update(1000);
        expect(set.spinning).toBe(false);
    });

    it("rejects the wrong number of reels", () => {
        const set = new ReelSetMotion({ reelsSizes: [3, 3], symbols: SYMBOLS });
        expect(() => set.set(columns)).toThrow("Expected 2 reels, got 3");
    });
});
