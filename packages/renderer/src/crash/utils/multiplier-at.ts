/** `m = e^(k·t)`, t in ms: the provider's growth curve when it shares one (`curve.kind: "exp"`). */
export function multiplierAt(k: number, elapsedMs: number): number {
    return Math.exp(k * Math.max(0, elapsedMs));
}
