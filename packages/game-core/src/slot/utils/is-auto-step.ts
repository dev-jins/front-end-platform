import type { Step } from "@fep/protocol/slot";

import { AUTO_STEPS } from "../constants/auto-steps";
import type { AutoStep } from "../types/auto-step.type";

export const isAutoStep = (step: Step | undefined): step is AutoStep => AUTO_STEPS.includes(step as AutoStep);
