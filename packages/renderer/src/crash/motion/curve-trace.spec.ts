import { CurveTrace } from "./curve-trace";

describe("CurveTrace", () => {
    it("keeps one point per step and a head that follows every frame", () => {
        const trace = new CurveTrace(50);
        for (const t of [0, 16, 33, 50, 66]) trace.add(t, 1 + t / 1000);
        expect(trace.points).toEqual([
            { t: 0, m: 1 },
            { t: 50, m: 1.05 },
            { t: 66, m: 1.066 },
        ]);
    });

    it("finds the first point at or above a multiplier", () => {
        const trace = new CurveTrace(50);
        for (const t of [0, 50, 100, 150]) trace.add(t, 1 + t / 100);
        expect(trace.pointAt(1.6)).toEqual({ t: 100, m: 2 });
        expect(trace.pointAt(9)).toBeNull();
    });

    it("reset clears the round", () => {
        const trace = new CurveTrace();
        trace.add(0, 1);
        trace.add(10, 1.01);
        trace.reset();
        trace.add(0, 1);
        expect(trace.points).toEqual([{ t: 0, m: 1 }]);
    });
});
