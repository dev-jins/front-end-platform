import type { CrashState } from "@fep/game-core/crash";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { StoreApi } from "zustand/vanilla";

import type { CrashHudState } from "./types/crash-hud-state.type";

export const useCrashHudState = (store: StoreApi<CrashState>): CrashHudState =>
    useStore(
        store,
        useShallow((s) => ({
            phase: s.phase,
            connection: s.connection,
            init: s.init,
            balance: s.balance,
            error: s.error,
            history: s.history,
            topWins: s.topWins,
            laneIds: Object.keys(s.lanes).sort().join(","),
        }))
    );
