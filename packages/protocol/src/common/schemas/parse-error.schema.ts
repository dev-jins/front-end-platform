import { z } from "zod";

/** http 422 when the request body is not valid JSON. */
export const parseErrorSchema = z.object({ error: z.string() });
