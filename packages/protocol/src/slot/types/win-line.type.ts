import type { z } from "zod";

import type { winLineSchema } from "../schemas/win-line.schema";

export type WinLine = z.infer<typeof winLineSchema>;
