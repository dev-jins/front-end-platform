import { z } from "zod";

export const bigwinStepsSchema = z.object({
    firstStep: z.number(),
    secondStep: z.number(),
    thirdStep: z.number(),
    fourthStep: z.number(),
    fifthStep: z.number(),
});
