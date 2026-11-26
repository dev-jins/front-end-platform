/**
 * Hand-written Provider A payloads. docs/crash-api.md lists field names only (no JSON examples), so these follow the
 * documented names with guessed value formats. Replace with recorded payloads once available.
 */
export const myStatsExample = {
    roundId: 88,
    state: "running",
    multiplier: 1.37,
    startAt: 1764089995000,
    crashPoint: null,
    history: [{ roundId: 87, crashPoint: "3.10", ts: 1764089990000 }],
    myBet: { amount: "1.00", currency: "USD", cashout: null, win: null, autoCashout: "2.00" },
    bets: [{ id: 501, username: "player1", amount: "5.00", currency: "USD", multiplier: null, win: null }],
    topWins: [],
    myBetsList: [],
    lastEvent: null,
    balance: { sessionKey: "abc", currency: "USD", amount: "102.00" },
};

export const nativeInitExample = {
    fingerprint: "ZmluZ2VycHJpbnQ=",
    sessionKey: "abc",
    server: {
        url: "https://mercure.example.com/.well-known/mercure",
        publicTopic: "crash/rocket/public",
        playerTopic: "crash/rocket/player/42",
        subscriberToken: "sub-token",
    },
    crashInit: myStatsExample,
};

export const clone = <T>(value: T): T => structuredClone(value);
