import type { z } from "zod";

import type { actionWrapperSchema } from "../schemas/action-wrapper.schema";

export type ActionWrapper = z.infer<typeof actionWrapperSchema>;
