# @fep/game-core

Framework-free game logic (plain TS + `zustand/vanilla`, no React). HUD and renderer read its store and send intents;
they never call the API.

| Entry point           | What                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `@fep/game-core`      | Shared: `SessionError`, `toSessionError` (error level policy)        |
| `@fep/game-core/slot` | `createSlotSession`, `StateAdapter`, `standardStateAdapter`, `Round` |

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

```sh
bun nx test game-core --coverage
```
