import type { z } from "zod";

import type { tournamentWinnerPopupSchema } from "../schemas/tournament-winner-popup.schema";

export type TournamentWinnerPopup = z.infer<typeof tournamentWinnerPopupSchema>;
