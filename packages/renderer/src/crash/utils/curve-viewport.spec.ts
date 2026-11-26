import { curveViewport } from "./curve-viewport";
import { toScreenPoint } from "./to-screen-point";

describe("curveViewport", () => {
    it("starts at the minimum range", () => {
        expect(curveViewport([])).toEqual({ maxTime: 8000, maxMultiplier: 2 });
        expect(curveViewport([{ t: 1000, m: 1.2 }])).toEqual({ maxTime: 8000, maxMultiplier: 2 });
    });

    it("grows with headroom once the curve passes it", () => {
        expect(
            curveViewport([
                { t: 0, m: 1 },
                { t: 16000, m: 5 },
            ])
        ).toEqual({ maxTime: 20000, maxMultiplier: 6 });
    });
});

describe("toScreenPoint", () => {
    const viewport = { maxTime: 10000, maxMultiplier: 3 };

    it("puts 1x at the bottom-left and the viewport's corner at the top-right", () => {
        expect(toScreenPoint({ t: 0, m: 1 }, viewport, 400, 200)).toEqual({ x: 0, y: 200 });
        expect(toScreenPoint({ t: 10000, m: 3 }, viewport, 400, 200)).toEqual({ x: 400, y: 0 });
        expect(toScreenPoint({ t: 5000, m: 2 }, viewport, 400, 200)).toEqual({ x: 200, y: 100 });
    });
});
