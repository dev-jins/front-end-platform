import { actionWrapperSchema } from "./action-wrapper.schema";
import { gameStateSchema } from "./game-state.schema";

/** Action response of a standard game: state + wrapper at the root. */
export const standardActionResponseSchema = gameStateSchema.extend(actionWrapperSchema.shape);
