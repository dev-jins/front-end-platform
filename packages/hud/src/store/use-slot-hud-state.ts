import type { SlotState } from "@fep/game-core/slot";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { StoreApi } from "zustand/vanilla";

import type { SlotHudState } from "./types/slot-hud-state.type";

export const useSlotHudState = <S>(store: StoreApi<SlotState<S>>): SlotHudState<S> =>
    useStore(
        store,
        useShallow((s) => ({
            phase: s.phase,
            init: s.init,
            balance: s.balance,
            win: s.displayed?.totalWin ?? null,
            mode: s.displayed?.mode ?? null,
            nextStep: s.displayed?.nextStep ?? null,
            error: s.error,
            startPopup: s.tournamentStartPopup,
            winnerPopup: s.tournamentWinnerPopup,
        }))
    );
