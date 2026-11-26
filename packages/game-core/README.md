# @fep/game-core

Framework-free game logic (plain TS + `zustand/vanilla`, no React). HUD and renderer read its store and send intents;
they never call the API.

| Entry point           | What                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `@fep/game-core`      | Shared: `SessionError`, `toSessionError` (error level policy)        |
| `@fep/game-core/slot` | `createSlotSession`, `StateAdapter`, `standardStateAdapter`, `Round` |
| `@fep/game-core/crash` | `createCrashStore`, `CrashState`, `applyCrashEvent` (stream event reducer) |

## Slot session

```ts
const session = createSlotSession({
  sessionKey,
  createTransport: (key) => createSlotHttpTransport({ baseUrl, sessionKey: key }),
  adapter: standardStateAdapter, // variant games pass their own
  present: (round) => renderer.play(round), // resolves when the reels land
});

await session.start(); // game init, once
await session.loaded(); // after assets load
await session.spin("10"); // false = not allowed now, nothing sent
useStore(session.store, (s) => s.balance); // React HUD
```

- **Init once.** `start()` ignores repeat calls: init rotates the fingerprint, so a second init locks out this tab
  (112).
- **Present after animate.** A response goes to `pending`, `present()` plays it, and only then are `displayed` and
  `balance` committed — the HUD never shows the win before the reels land.
- **`nextStep` drives.** `freespin`, `respin` and `avalanche` run automatically; `spin`, `buy`, `bonus`,
  `openFieldItem`, `next()` (jackpot / getPreviousState) are player intents, refused unless the server expects that
  step.
- **Guarded intents.** Bets not in `bets`, non-integer lines, unknown bonus variants and invalid cells are refused
  locally, because the API answers them with CRITICAL errors that end the session.
- **Errors by level.** CRITICAL → `phase: "over"`; ALERT → `error` dialog, `dismissError()` retries interrupted auto
  steps; WARNING → `onWarning`. Network failures and invalid responses are CRITICAL: the round may have been played, so
  re-sending could play it twice — reload recovers through init's `lastSpin`.
- **Operator freespins handoff.** When `externalFreespins.nextSessionKey` arrives, the session switches transport and
  inits the new key.

## Crash store

```ts
const store = createCrashStore();
transport.subscribe({
  onEvent: (event) => store.setState((s) => applyCrashEvent(s, event, Date.now())),
  onStatus: (connection) => store.setState({ connection }),
});
```

- **Pure reducer.** `applyCrashEvent(state, event, receivedAt)` folds canonical stream events (`@fep/protocol/crash`)
  into `CrashState`; the session (next step) owns the transport, intents and errors.
- **Snapshot replaces, events patch.** A `snapshot` replaces lanes, history, top wins, my bets and balance, keeping
  each lane's `pending` command, and resets `lastSeq` so a new connection is always accepted. Other events at or below
  `lastSeq` are repeats and are ignored.
- **Lanes by id.** `lanes[1..3]`, only those the snapshot sent; a game without lanes has lane 1. An event for an unseen
  round starts that round first (its `roundStart` was missed).
- **Own bet.** `myBetAccepted` sets `myBet`; `myBetSettled` keeps a cashed-out bet on the lane until the next round,
  removes a lost one, and prepends the result to `myBets` (newest `MY_BETS_LIMIT`).
- **Clock.** `clockOffsetMs` is the largest `serverTime − receivedAt` seen (delivery delay only makes samples smaller).
  The renderer computes the curve from `Date.now() + clockOffsetMs`.
- Not here yet: per-frame batching of live-bet events (a session / renderer concern).

```sh
bun nx test game-core --coverage
```
