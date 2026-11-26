import type { Cashout } from "@fep/protocol/crash";

import { STATE_TO_PHASE } from "../config/state-to-phase";
import { nativeAmountSchema } from "../schemas/native-amount.schema";
import type { CrashSnapshotEvent } from "../types/crash-snapshot-event.type";
import type { MyStats } from "../types/my-stats.type";

/**
 * myStats → canonical `snapshot` (lane 1). Throws on an unknown `state` so a wrong guess shows up at once.
 * TODO[techdebt]: `topWins` / `myBetsList` shapes are not documented, sent empty until they are.
 */
export function toCrashSnapshot(stats: MyStats, seq: number, serverTime: number): CrashSnapshotEvent {
    const phase = STATE_TO_PHASE[stats.state];
    if (!phase) throw new Error(`Provider A: unknown crash state "${stats.state}"`);

    const { myBet } = stats;
    const cashoutMultiplier = myBet ? nativeAmountSchema.safeParse(myBet.cashout) : undefined;
    const cashout: Cashout | null = cashoutMultiplier?.success
        ? { multiplier: cashoutMultiplier.data, win: myBet?.win ?? "0" }
        : null;

    return {
        seq,
        serverTime,
        type: "snapshot",
        lanes: [
            {
                lane: 1,
                roundId: stats.roundId,
                phase,
                // Assumption: before the flight, `startAt` is when the countdown ends.
                countdownEndsAt: phase === "countdown" ? stats.startAt : null,
                startAt: phase === "running" || phase === "crashed" ? stats.startAt : null,
                multiplier: stats.multiplier,
                crashPoint: stats.crashPoint,
                myBet: myBet && {
                    roundId: stats.roundId,
                    lane: 1,
                    amount: myBet.amount,
                    currency: myBet.currency,
                    autoCashout: myBet.autoCashout ?? null,
                    cashout,
                },
                bets: stats.bets,
            },
        ],
        history: stats.history,
        topWins: [],
        myBets: [],
        balance: stats.balance.amount,
    };
}
