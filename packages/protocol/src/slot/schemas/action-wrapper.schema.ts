import { z } from "zod";

import { balanceSchema } from "../../common/schemas/balance.schema";
import { tournamentStartPopupSchema } from "../../common/schemas/tournament-start-popup.schema";
import { tournamentWinnerPopupSchema } from "../../common/schemas/tournament-winner-popup.schema";
import { externalFreespinsSchema } from "./external-freespins.schema";

/** Fields every action response adds next to the (game specific) state at its root. */
export const actionWrapperSchema = z.object({
    balance: balanceSchema,
    externalFreespins: externalFreespinsSchema.nullish(),
    tournamentStartPopup: tournamentStartPopupSchema.nullish(),
    tournamentWinnerPopup: tournamentWinnerPopupSchema.nullish(),
});
