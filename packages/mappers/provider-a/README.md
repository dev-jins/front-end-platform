# @fep/mapper-provider-a

Provider A (the current Game API, `docs/crash-api.md`) translated into the canonical protocol (`@fep/protocol`), plus
its direct transport. Tag `type:mapper`: depends on `@fep/protocol` only; only apps import it (they pick the transport
from launch config, see `docs/crash-architecture.html`).

| Entry point                    | Folder        | What                                                                  |
| ------------------------------ | ------------- | --------------------------------------------------------------------- |
| `@fep/mapper-provider-a/crash` | `src/crash/`  | Native crash schemas, translators to canonical, `createDirectCrashTransport` |

## Crash

- `createDirectCrashTransport(options)` — a `CrashTransport` that talks to Provider A from the browser: `GET
  /game/{sessionKey}` once (it rotates the fingerprint), commands to `/crash/bet` / `cancelBet` / `push`, events from
  the Mercure hub (one connection, both topics, Bearer `subscriberToken`).
- Provider A's event payloads are not documented, so only `tick` is translated directly. Every other event triggers a
  `GET /crash/myStats` (bursts merged into one call) that becomes a canonical `snapshot`. Ticks wait until the
  connection's first snapshot is out.
- What Provider A doesn't send comes from options: game ids, `demo`, `decimals`, bet limits, capabilities.

### Known gaps (`TODO[techdebt]` in code)

- Non-lane games only (`capabilities.lanes: 1`): the lane myStats shape is not documented.
- `state` → phase mapping is a guess (`STATE_TO_PHASE`); an unknown state fails the snapshot and is reported to
  `onError`.
- `startAt` format, the meaning of `myBet.cashout`, `topWins` / `myBetsList` shapes (sent empty) are not documented.
- No server time from Provider A: events carry client time.
- Test fixtures (`tests/native-examples.ts`) are hand-written from field names; replace with recorded payloads.

```sh
bun nx test mapper-provider-a --coverage
```
