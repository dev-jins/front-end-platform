import { z } from "zod";

export const fieldItemSchema = z.object({ col: z.int(), row: z.int(), item: z.string() });
