import { z } from "zod";

export const crashPhaseSchema = z.enum(["starting", "countdown", "running", "crashed"]);
