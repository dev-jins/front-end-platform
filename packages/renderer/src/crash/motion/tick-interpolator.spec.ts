import { TickInterpolator } from "./tick-interpolator";

describe("TickInterpolator", () => {
    it("is null before any tick, then the first tick as is", () => {
        const ticks = new TickInterpolator();
        expect(ticks.valueAt(0)).toBeNull();
        ticks.push(1.1, 1000);
        expect(ticks.valueAt(5000)).toBe(1.1);
    });

    it("eases from the previous tick to the latest over the gap between them, then holds", () => {
        const ticks = new TickInterpolator();
        ticks.push(1.0, 1000);
        ticks.push(1.2, 1100);
        expect(ticks.valueAt(1100)).toBe(1.0);
        expect(ticks.valueAt(1150)).toBeCloseTo(1.1, 10);
        expect(ticks.valueAt(1300)).toBe(1.2);
        expect(ticks.valueAt(900)).toBe(1.0);
    });

    it("jumps to the latest when two ticks arrive together; reset clears", () => {
        const ticks = new TickInterpolator();
        ticks.push(1.0, 1000);
        ticks.push(1.2, 1000);
        expect(ticks.valueAt(1000)).toBe(1.2);
        ticks.reset();
        expect(ticks.valueAt(1000)).toBeNull();
    });
});
