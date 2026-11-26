import { createStore, type StoreApi } from "zustand/vanilla";

import { initialCrashState } from "./constants/initial-crash-state";
import type { CrashState } from "./types/crash-state.type";

export const createCrashStore = (): StoreApi<CrashState> => createStore<CrashState>()(() => initialCrashState);
