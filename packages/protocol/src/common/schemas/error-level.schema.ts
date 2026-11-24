import { z } from "zod";

export const errorLevelSchema = z.enum(["CRITICAL", "ALERT", "WARNING"]);
