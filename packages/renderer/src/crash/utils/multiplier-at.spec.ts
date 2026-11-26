import { multiplierAt } from "./multiplier-at";

describe("multiplierAt", () => {
    it("grows as e^(k·t) and starts at 1", () => {
        expect(multiplierAt(0.0001, 0)).toBe(1);
        expect(multiplierAt(0.0001, 10000)).toBeCloseTo(Math.E, 10);
        expect(multiplierAt(0.0001, -500)).toBe(1);
    });
});
