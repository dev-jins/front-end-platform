/** What the store binding needs from a scene. */
export interface SpinView {
    startSpin(): void;
    stopOn(columns: string[][]): Promise<void>;
}
