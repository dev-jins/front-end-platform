import type { z } from "zod";

import type { tournamentSchema } from "../schemas/tournament.schema";

export type Tournament = z.infer<typeof tournamentSchema>;
