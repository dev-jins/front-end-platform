# @fep/protocol

Zod schemas, error mapping and transports for the Game Front API (`docs/Test Game Front API.md`), split by game
family.

| Entry point           | Folder        | What                                                                                                     |
| --------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| `@fep/protocol`       | `src/common/` | Shared by every family: money, balance, error levels / bodies, `GameApiError`, `ERROR_CODE`, tournaments |
| `@fep/protocol/slot`  | `src/slot/`   | Slot games: init, `GameState`, action wrapper, `SLOT_ERROR_CODE`, `SlotTransport` (HTTP)                 |
| `@fep/protocol/crash` | —             | Not yet: added with the crash API spec (socket messages + its own transport)                             |

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

## Tests

Tests parse the JSON examples straight from the API doc (`tests/doc-examples.ts`), so a doc change that breaks the
contract fails here.

```sh
bun nx test protocol --coverage
```
