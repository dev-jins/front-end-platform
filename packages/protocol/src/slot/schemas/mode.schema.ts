import { z } from "zod";

export const modeSchema = z.enum(["spin", "freespin"]);
