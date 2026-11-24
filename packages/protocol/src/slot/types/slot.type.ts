import type { z } from "zod";

import type { slotSchema } from "../schemas/slot.schema";

export type Slot = z.infer<typeof slotSchema>;
