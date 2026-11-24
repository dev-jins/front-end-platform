import type { z } from "zod";

import type { tournamentStartPopupSchema } from "../schemas/tournament-start-popup.schema";

export type TournamentStartPopup = z.infer<typeof tournamentStartPopupSchema>;
