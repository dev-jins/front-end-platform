# @fep/game-core

Framework-free game logic (plain TS + `zustand/vanilla`, no React). HUD and renderer read its store and send intents;
they never call the API.

| Entry point           | What                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `@fep/game-core`      | Shared: `SessionError`, `toSessionError` (error level policy)        |
| `@fep/game-core/slot` | `createSlotSession`, `StateAdapter`, `standardStateAdapter`, `Round` |
| `@fep/game-core/crash` | `createCrashSession`, `CrashState`, `applyCrashEvent` (stream event reducer), `createCrashStore` |

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

## Crash session

```ts
const session = createCrashSession({
  transport, // gateway, direct (Provider A) or mock — picked by the app from launch config
});

await session.start(); // init once, then the event stream
await session.bet(1, "1.00", "2.00"); // lane, amount, optional auto cash-out; false = not allowed, nothing sent
await session.cashout(1);
useStore(session.store, (s) => s.lanes[1]?.multiplier); // React HUD
```

- **Init once, then stream.** `start()` ignores repeat calls. Stream events are queued and applied in one store update
  per burst (`scheduleFlush`, default a 16 ms timer — not `requestAnimationFrame`, which stops in hidden tabs).
- **Guarded intents.** Refused locally unless the session is `ready`, the stream `live`, no error is open and nothing is
  in flight on that lane. `bet`: countdown (or any phase when the provider queues for the next round), no bet yet,
  amount within `init.bets`, auto cash-out ≥ the provider's minimum (and only if it has one). `cancelBet`: countdown,
  with a bet. `cashout`: running, bet for this round, not cashed out.
- **Pending.** The lane's `pending` is set while a command is in flight; the response's balance, bet and cash-out are
  applied when it lands. Every command gets a fresh `requestId` (`crypto.randomUUID()`).
- **Errors by level.** CRITICAL → `phase: "over"`; ALERT → `error`, `dismissError()`; WARNING → `onWarning`. Unlike
  slots, a network failure or unreadable response is ALERT: commands are idempotent by `requestId` and the stream
  reports what happened to the bet. Init failures and a refused stream (`offline`) end the session.

### Reducer

- `applyCrashEvent(state, event, receivedAt)` is pure. A `snapshot` replaces lanes, history, top wins, my bets and
  balance, keeping each lane's `pending`, and resets `lastSeq` so a new connection is always accepted. Other events at
  or below `lastSeq` are repeats and are ignored.
- Lanes by id: only those the snapshot sent (lane 1 for games without lanes). An event for an unseen round starts that
  round first (its `roundStart` was missed).
- `myBetSettled` keeps a cashed-out bet on the lane until the next round, removes a lost one, and prepends the result
  to `myBets` (newest `MY_BETS_LIMIT`).
- `clockOffsetMs` is the largest `serverTime − receivedAt` seen; the renderer draws the curve from
  `Date.now() + clockOffsetMs`.

```sh
bun nx test game-core --coverage
```
