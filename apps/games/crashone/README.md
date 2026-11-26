# crashone

Crash game client: `@fep/renderer/crash` curve on a Pixi canvas, `@fep/hud/crash` on top, `@fep/game-core/crash`
session in between. Booted once outside React (`src/game.ts`).

```sh
bun run serve:crashone   # http://localhost:4310 — dev mock, no backend needed
```

## Launch config (`src/launch/`)

The URL the lobby opens picks the transport; nothing else in the app knows which one runs.

| URL                                | Transport                                     | Needs                                    |
| ---------------------------------- | --------------------------------------------- | ---------------------------------------- |
| `?launchToken=…`                   | gateway (`createGatewayCrashTransport`)       | `VITE_GATEWAY_URL` or `&gatewayUrl=`     |
| `?sessionKey=…` (`&demo=1`)        | Provider A direct (`createDirectCrashTransport`) | `VITE_API_URL`; ids, limits, capabilities from `src/config/provider-a-game-config.ts` (placeholders, TODO) |
| nothing                            | dev mock                                      | dev build only — a production build errors instead of showing fake money |

## Dev mock (`src/dev/create-dev-crash-transport.ts`)

100 generated rounds (5 s countdown, curve doubling every 7 s, random crash points up to 50x, a few other players
betting and cashing out), replayed by `createMockCrashTransport`. Bets, cancels and cash-outs are answered against the
same clock: cash-out pays at the curve's multiplier, too late after the crash. Not simulated: auto cash-out, settle
events for the player's own bets (a lost bet clears at the next round), more than one lane. Reload for a new timeline.

```sh
bun nx test crashone --coverage
```
