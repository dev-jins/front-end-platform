# Crash API

Base path: `/api/v1`.

## `GET /game/{sessionKey}`

**Response fields:**

- `server.url` — Mercure URL.
- `server.publicTopic`, `server.playerTopic` — topics for game updates.
- `server.subscriberToken` — token for subscribing to `playerTopic`.
- `crashInit` — initial round and player state (see `GET /crash/myStats`).

## Mercure updates

Subscribe to both topics returned in `server`:

- `server.publicTopic` — round and public bet updates.
- `server.playerTopic` — updates for this player. Authorize with `server.subscriberToken` as a Bearer token.

Connect to `server.url` using Mercure/SSE. Add each topic as a `topic` query parameter and send `Authorization: Bearer {subscriberToken}`. Use an EventSource client that supports custom headers.

General subscription URLs (use the values from `server` in the game response):

- Public updates: `curl -v -L 'https://<mercure-host>/.well-known/mercure?topic=<server.publicTopic>' -H 'Authorization: Bearer <subscriberToken>'`
- Player updates: `curl -v -L 'https://<mercure-host>/.well-known/mercure?topic=<server.playerTopic>' -H 'Authorization: Bearer <subscriberToken>'`

Each SSE `data` value is a JSON object. Read `type` to handle the event; common types include `round_start`, `countDown`, `running`, `tick`, `crash`, `stats`, `bet_added`, `bet_removed`, `bet_ok`, and `my_bet_result`. Events may include `roundId`, `lane`, `multiplier`, `amount`, and other event-specific fields. Lane-based game updates include `lane` in the event payload.

## `GET /game/{sessionKey}/crash/myStats`

**Response fields:**

- `roundId`, `state`, `multiplier`, `startAt`, `crashPoint` — current round. `crashPoint` is `null` until the round crashes.
- `history[]` — recent results: `roundId`, `crashPoint`, `ts` (milliseconds).
- `myBet` — current player's bet, or `null`: `amount`, `currency`, `cashout`, `win`, `autoCashout`.
- `bets[]` — bets in the current round: `id`, `username`, `amount`, `currency`, `multiplier`, `win`.
- `topWins[]` — top wins.
- `myBetsList[]` — player's recent bets.
- `lastEvent` — latest game event, or `null`.
- `balance` — `{ sessionKey, currency, amount }`.
- For lane-based games, round state, `myBet` and `bets` are keyed by lane (`1`, `2`, `3`); `freeRound` is also returned per lane.

## `POST /game/{sessionKey}/crash/bet`

**Required body fields:**

- `bet` (string/number) — positive stake amount.

**Optional body fields:**

- `autoCashout` (string/number, optional) — target multiplier, minimum `1.01`.
- `fingerprint` (string) — client fingerprint.
- `lane` (integer, optional) — lane number (`1`, `2`, or `3`). Required only for lane-based games; omit otherwise.

**Response:** `balance: { sessionKey, currency, amount }` — updated player balance.

## `POST /game/{sessionKey}/crash/cancelBet`

**Required body fields:** none.

**Optional body fields:**

- `fingerprint` (string) — client fingerprint.
- `lane` (integer, optional) — lane number (`1`, `2`, or `3`). Required only for lane-based games; omit otherwise.

**Response:** `balance: { sessionKey, currency, amount }` — updated player balance.

## `POST /game/{sessionKey}/crash/push`

**Required body fields:** none.

**Optional body fields:**

- `fingerprint` (string) — client fingerprint.
- `lane` (integer, optional) — lane number (`1`, `2`, or `3`). Required only for lane-based games; omit otherwise.

**Response fields:**

- `multiplier` — cashout multiplier.
- `winAmount` — win amount.
- `balance: { sessionKey, currency, amount }` — updated player balance.

