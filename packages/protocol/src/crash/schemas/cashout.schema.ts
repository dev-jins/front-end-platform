import { z } from "zod";

import { numericStringSchema } from "../../common/schemas/numeric-string.schema";

/** Server values are final: show these, not the multiplier on screen when the player clicked. */
export const cashoutSchema = z.object({ multiplier: numericStringSchema, win: numericStringSchema });
