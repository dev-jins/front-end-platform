import { formatMoney, isZeroMoney, multiplyMoney, percentOf } from "./money.js";

describe("multiplyMoney", () => {
  it("multiplies exactly", () => {
    expect(multiplyMoney("10", 10)).toBe("100");
    expect(multiplyMoney("0.1", 3)).toBe("0.3"); // 0.1 * 3 = 0.30000000000000004 as floats
    expect(multiplyMoney("-1.05", 2)).toBe("-2.10");
    expect(multiplyMoney("0.05", 1)).toBe("0.05");
  });

  it("rejects non-integer factors and malformed amounts", () => {
    expect(() => multiplyMoney("1", 1.5)).toThrow("integer");
    expect(() => multiplyMoney("1e3", 2)).toThrow("Not a decimal");
  });
});

describe("percentOf", () => {
  it("applies an integer percent exactly", () => {
    expect(percentOf("100", 100)).toBe("100.00");
    expect(percentOf("0.3", 150)).toBe("0.450");
    expect(() => percentOf("1", 0.5)).toThrow("integer");
  });
});

describe("isZeroMoney", () => {
  it("detects zero in any notation", () => {
    expect(isZeroMoney("0")).toBe(true);
    expect(isZeroMoney("0.00")).toBe(true);
    expect(isZeroMoney("-0")).toBe(true);
    expect(isZeroMoney("0.01")).toBe(false);
  });
});

describe("formatMoney", () => {
  it("formats an ISO currency with the given decimals", () => {
    expect(formatMoney("10300", { currency: "USD", rounding: 0, locale: "en" })).toBe("$10,300");
    expect(formatMoney("10300", { currency: "EUR", rounding: 2, locale: "en" })).toBe("€10,300.00");
  });

  it("rounds the exact decimal, not its float approximation", () => {
    // As a float, 1.005 is 1.00499999999999989…, which would round down.
    expect(formatMoney("1.005", { currency: "USD", rounding: 2, locale: "en" })).toBe("$1.01");
    expect(formatMoney("12345678901234567.89", { currency: "USD", rounding: 2, locale: "en" })).toBe(
      "$12,345,678,901,234,567.89"
    );
  });

  it("appends codes Intl does not accept as a currency", () => {
    expect(formatMoney("1234.5", { currency: "USDT", rounding: 2, locale: "en" })).toBe("1,234.50 USDT");
  });

  it("rejects malformed amounts", () => {
    expect(() => formatMoney("abc", { currency: "USD", rounding: 0 })).toThrow("Not a decimal");
  });
});
