import type { z } from "zod";

import type { gameStateSchema } from "../schemas/game-state.schema";

export type GameState = z.infer<typeof gameStateSchema>;
