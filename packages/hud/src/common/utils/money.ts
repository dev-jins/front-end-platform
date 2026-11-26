// Money arrives as numeric strings ("10300", "0.125"). Arithmetic here is exact (BigInt on scaled units) and
// formatting uses Intl's string input, so no amount ever passes through a float.

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

function parse(amount: string): { units: bigint; decimals: number } {
    const match = DECIMAL.exec(amount);
    if (!match) throw new Error(`Not a decimal amount: "${amount}"`);
    const [, sign = "", int = "", fraction = ""] = match;
    return { units: BigInt(sign + int + fraction), decimals: fraction.length };
}

function toDecimal(units: bigint, decimals: number): string {
    const negative = units < 0n;
    const digits = (negative ? -units : units).toString().padStart(decimals + 1, "0");
    const int = digits.slice(0, digits.length - decimals);
    const fraction = digits.slice(digits.length - decimals);
    return (negative ? "-" : "") + (decimals > 0 ? `${int}.${fraction}` : int);
}

/** `amount × factor` for an integer factor, e.g. bet per line × lines. */
export function multiplyMoney(amount: string, factor: number): string {
    if (!Number.isInteger(factor)) throw new Error(`Factor must be an integer, got ${factor}`);
    const { units, decimals } = parse(amount);
    return toDecimal(units * BigInt(factor), decimals);
}

/** `amount × percent / 100` for an integer percent, e.g. buy price = total bet × `bonusCoefficient`%. */
export function percentOf(amount: string, percent: number): string {
    if (!Number.isInteger(percent)) throw new Error(`Percent must be an integer, got ${percent}`);
    const { units, decimals } = parse(amount);
    return toDecimal(units * BigInt(percent), decimals + 2);
}

/** `amount × factor` for a decimal factor, exact, e.g. bet × multiplier for a potential win. Formatting rounds it. */
export function multiplyByDecimal(amount: string, factor: string): string {
    const a = parse(amount);
    const b = parse(factor);
    return toDecimal(a.units * b.units, a.decimals + b.decimals);
}

/** True for "0", "0.00", "-0". */
export function isZeroMoney(amount: string): boolean {
    return parse(amount).units === 0n;
}

export interface MoneyFormat {
    /** ISO 4217 code; non-ISO codes (e.g. crypto) are appended after the number. */
    currency: string;
    /** Decimals to show: `currencyData.rounding`. */
    rounding: number;
    locale?: string;
}

/** Formats a numeric string exactly (rounding half up at `rounding` decimals). */
export function formatMoney(amount: string, { currency, rounding, locale }: MoneyFormat): string {
    parse(amount); // reject anything that is not a plain decimal before Intl sees it
    const value = amount as `${number}`;
    const digits = { minimumFractionDigits: rounding, maximumFractionDigits: rounding };
    try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, ...digits }).format(value);
    } catch {
        return `${new Intl.NumberFormat(locale, digits).format(value)} ${currency}`;
    }
}
