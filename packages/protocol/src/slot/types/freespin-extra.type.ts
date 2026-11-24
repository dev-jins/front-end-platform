import type { z } from "zod";

import type { freespinExtraSchema } from "../schemas/freespin-extra.schema";

export type FreespinExtra = z.infer<typeof freespinExtraSchema>;
