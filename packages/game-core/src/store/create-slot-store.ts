import { createStore, type StoreApi } from "zustand/vanilla";

import { initialSlotState } from "./constants/initial-slot-state";
import type { SlotState } from "./types/slot-state.type";

export const createSlotStore = <S>(): StoreApi<SlotState<S>> => createStore<SlotState<S>>()(() => initialSlotState);
