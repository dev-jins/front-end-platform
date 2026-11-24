import { z } from "zod";

export const stepSchema = z.enum([
    "spin",
    "freespin",
    "buy",
    "respin",
    "avalanche",
    "bonus",
    "getPreviousState",
    "jackpot",
]);
