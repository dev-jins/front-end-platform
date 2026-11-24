import type { z } from "zod";

import type { tournamentsResponseSchema } from "../schemas/tournaments-response.schema";

export type TournamentsResponse = z.infer<typeof tournamentsResponseSchema>;
