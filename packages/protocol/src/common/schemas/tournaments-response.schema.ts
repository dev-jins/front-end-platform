import { z } from "zod";

import { tournamentSchema } from "./tournament.schema";

export const tournamentsResponseSchema = z.object({ tournaments: z.array(tournamentSchema) });
