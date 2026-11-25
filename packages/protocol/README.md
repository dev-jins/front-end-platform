# @fep/protocol

Zod schemas, error mapping and transports for the Game Front API (`docs/Test Game Front API.md`), split by game
family.

| Entry point           | Folder        | What                                                                                                     |
| --------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| `@fep/protocol`       | `src/common/` | Shared by every family: money, balance, error levels / bodies, `GameApiError`, `ERROR_CODE`, tournaments |
| `@fep/protocol/slot`  | `src/slot/`   | Slot games: init, `GameState`, action wrapper, `SLOT_ERROR_CODE`, `SlotTransport` (HTTP)                 |
| `@fep/protocol/crash` | `src/crash/`  | Crash games, canonical protocol (gateway): init + capabilities, `/v1/play` commands, stream events |

A family never imports another family; shared code moves to `common/` only when a second family actually needs it.

## Common

- Money stays a numeric string (`numericStringSchema`); never convert it to a float.
- Non-2xx responses become `GameApiError` with `detail.kind`: `business` (422 code/level), `validation` (400), `parse`
  (422), `not-found` (404), `unexpected`.

## Slot

- `initResponseSchema`, `gameStateSchema`, `actionWrapperSchema`, `standardActionResponseSchema` — types via `z.infer`.
  `bets` are normalized to strings.
- `lastSpin` and action responses are game specific: `init().lastSpin` is `unknown` and `action()` returns raw JSON —
  the game adapter parses them (standard games use `standardActionResponseSchema`).
- `createSlotHttpTransport({ baseUrl, sessionKey })` — stateless, one session; the caller (game-core) owns the
  fingerprint.

## Crash

Canonical protocol, not a provider's native API (see `docs/crash-architecture.html`). Provider translation lives in
mappers, outside this package.

- `crashInitSchema` — session, game, money, bets, `capabilities.crash` (lanes, auto cash-out, curve, live bets),
  `stream`.
- `crashCommandSchema` / `crashCommandResultSchema` — `bet` / `cancelBet` / `cashout` with `requestId` and `lane`.
- `crashEventSchema` — stream events with `seq` + `serverTime`; the first one is always `snapshot`.
- `parseCrashEvent(raw)` — returns null for unknown event types (log and skip), throws on a bad known one.
- `CrashTransport` — `init()`, `play(command)`, `subscribe({ onEvent, onStatus, onError })` → close function.
  - `createGatewayCrashTransport({ baseUrl, launchToken })` — `POST /v1/sessions` with the launch token, then the
    session token for `/v1/play` and the SSE stream (read with `fetch`, not `EventSource`, to send `Authorization`).
    Reconnects with `Last-Event-ID` (1s, 2s, 5s…); 401 / 403 / 404 → `offline`, no retry.
  - `createMockCrashTransport({ init, events, speed, play })` — replays a recorded timeline by `serverTime`.
  - The direct transport (Provider A in the browser) lives with Provider A's mapper, not here.

## Tests

Tests parse the JSON examples straight from the API doc (`tests/doc-examples.ts`), so a doc change that breaks the
contract fails here.

```sh
bun nx test protocol --coverage
```
