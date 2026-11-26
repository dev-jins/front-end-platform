import { GameApiError } from "@fep/protocol";
import {
    type CrashEvent,
    type CrashInit,
    type CrashTransport,
    createMockCrashTransport,
    type RoundResult,
} from "@fep/protocol/crash";

import type { DevRound } from "./types/dev-round.type";

// Dev-only stand-in for a crash provider: a generated timeline of rounds replayed by the protocol's mock transport,
// and bets answered against the same clock, so the game is playable without a backend.
// ponytail: one lane, a finite timeline (reload for more), no auto cash-out and no settle events for the player's
// own bets — a lost bet clears at the next round. Script more when a feature needs to be seen.

/** Doubles every 7 s. */
const K = Math.log(2) / 7000;
const COUNTDOWN_MS = 5000;
const PAUSE_MS = 3000;
const TICK_MS = 100;
const ROUNDS = 100;
const PLAYERS = ["alice", "bob", "carol", "dave", "erin"];
const CURRENCY = "USD";

const multiplierAfter = (ms: number) => Math.floor(Math.exp(K * ms) * 100) / 100;
const money = (cents: number) => (cents / 100).toFixed(2);
const alert = (code: number, message: string) =>
    new GameApiError(422, { kind: "business", code, level: "ALERT", message });

export function createDevCrashTransport({ now = Date.now, random = Math.random } = {}): CrashTransport {
    const init: CrashInit = {
        session: { token: "dev", expiresAt: null, demo: true },
        game: { id: "dev:crashone", provider: "dev", family: "crash", clientId: "crashone" },
        money: { balance: "1000.00", currency: CURRENCY, decimals: 2 },
        bets: { min: "0.10", max: "100.00", default: "1.00" },
        capabilities: {
            crash: {
                lanes: 1,
                autoCashout: { min: "1.01" },
                curve: { kind: "exp", k: K },
                liveBets: true,
                betWhileRunning: "reject",
                freeRounds: false,
            },
        },
        stream: { kind: "sse", url: "" },
    };

    const rounds: DevRound[] = [];
    /** Built with seq 0, numbered after sorting by time. */
    const timeline: CrashEvent[] = [];
    let history: RoundResult[] = [];
    let t = now() + 300;
    timeline.push({
        seq: 0,
        serverTime: t,
        type: "snapshot",
        lanes: [
            {
                lane: 1,
                roundId: "r-1",
                phase: "starting",
                countdownEndsAt: null,
                startAt: null,
                multiplier: "1.00",
                crashPoint: null,
                myBet: null,
                bets: [],
            },
        ],
        history: [],
        topWins: [],
        myBets: [],
        balance: init.money.balance,
    });

    for (let i = 1; i <= ROUNDS; i++) {
        const roundId = `r-${i}`;
        const round = { lane: 1, roundId } as const;
        const startAt = t + COUNTDOWN_MS;
        // House edge-ish distribution: half the rounds end below 2x, capped for the dev screen.
        const crashPoint = Math.min(50, Math.max(1, Math.floor((0.99 / (1 - random())) * 100) / 100));
        const crashAt = startAt + Math.log(crashPoint) / K;
        rounds.push({ roundId, countdownAt: t, startAt, crashAt, crashPoint });

        timeline.push({ seq: 0, serverTime: t, type: "roundStart", ...round });
        timeline.push({ seq: 0, serverTime: t, type: "countdown", endsAt: startAt, ...round });
        for (const [n, username] of PLAYERS.slice(0, 2 + Math.floor(random() * 3)).entries()) {
            const id = `${roundId}-b${n}`;
            const amount = (1 + Math.floor(random() * 20)).toFixed(2);
            timeline.push({
                seq: 0,
                serverTime: t + 500 + n * 600,
                type: "betPlaced",
                bet: { id, username, amount, currency: CURRENCY, multiplier: null, win: null },
                ...round,
            });
            const target = 1.2 + random() * 2;
            if (target < crashPoint) {
                const cashout = { multiplier: target.toFixed(2), win: (Number(amount) * target).toFixed(2) };
                timeline.push({
                    seq: 0,
                    serverTime: startAt + Math.log(target) / K,
                    type: "betCashedOut",
                    betId: id,
                    cashout,
                    ...round,
                });
            }
        }
        timeline.push({ seq: 0, serverTime: startAt, type: "running", startAt, ...round });
        for (let at = startAt + TICK_MS; at < crashAt; at += TICK_MS) {
            timeline.push({
                seq: 0,
                serverTime: at,
                type: "tick",
                multiplier: multiplierAfter(at - startAt).toFixed(2),
                ...round,
            });
        }
        timeline.push({ seq: 0, serverTime: crashAt, type: "crash", crashPoint: crashPoint.toFixed(2), ...round });
        history = [{ roundId, crashPoint: crashPoint.toFixed(2), ts: Math.round(crashAt) }, ...history].slice(0, 20);
        timeline.push({ seq: 0, serverTime: crashAt + 1, type: "history", history, topWins: [] });
        t = crashAt + PAUSE_MS;
    }

    const events = timeline
        .sort((a, b) => a.serverTime - b.serverTime)
        .map((event, index) => ({ ...event, serverTime: Math.round(event.serverTime), seq: index + 1 }));

    let balanceCents = 100_000;
    const bets = new Map<string, number>();
    const roundAt = (time: number) => [...rounds].reverse().find((round) => round.countdownAt <= time);

    return createMockCrashTransport({
        init,
        events,
        play(command) {
            const time = now();
            const round = roundAt(time);
            if (!round) throw alert(1, "No round yet");
            const staked = bets.get(round.roundId);

            if (command.action === "bet") {
                if (time >= round.startAt) throw alert(1, "Betting is closed");
                if (staked !== undefined) throw alert(1, "Already bet this round");
                const cents = Math.round(Number(command.bet) * 100);
                if (cents > balanceCents) throw alert(3, "Not enough money");
                balanceCents -= cents;
                bets.set(round.roundId, cents);
                return {
                    balance: money(balanceCents),
                    bet: {
                        roundId: round.roundId,
                        lane: 1,
                        amount: money(cents),
                        currency: CURRENCY,
                        autoCashout: command.autoCashout ?? null,
                        cashout: null,
                    },
                };
            }
            if (staked === undefined) throw alert(1, "No bet this round");
            bets.delete(round.roundId);
            if (command.action === "cancelBet") {
                if (time >= round.startAt) throw alert(1, "Betting is closed");
                balanceCents += staked;
                return { balance: money(balanceCents) };
            }
            if (time < round.startAt || time >= round.crashAt) throw alert(1, "Too late: the round crashed");
            const multiplier = multiplierAfter(time - round.startAt);
            const winCents = Math.floor(staked * multiplier);
            balanceCents += winCents;
            return {
                balance: money(balanceCents),
                cashout: { multiplier: multiplier.toFixed(2), win: money(winCents) },
            };
        },
    });
}
