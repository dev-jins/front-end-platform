import type { Container } from "pixi.js";

export interface CrashLaneView {
    /** Add to the stage; local size is `width` × `height`. Lane games place one view per lane. */
    view: Container;
    width: number;
    height: number;
    destroy(): void;
}
