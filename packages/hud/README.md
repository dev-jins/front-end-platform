# @fep/hud

React HUD over the game canvas. Reads the game-core store and sends intents; never calls the API.

| Entry point     | What                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| `@fep/hud/slot` | `SlotHud`, money helpers (`formatMoney`, `multiplyMoney`, `percentOf`) |
| `@fep/hud/crash` | `CrashHud`, `BetSlot`, `BetList`, money helpers (`multiplyByDecimal`, …) |

```tsx
<SlotHud session={session} buyFeature={false} />
<CrashHud session={crashSession} />
```

Shared by both families: `common/utils/money.ts`, `common/components/dialog.tsx`.

## Slot

- Balance, win, bet stepper with total bet (bet × lines), spin, optional buy bonus (price = total bet × `bonusCoefficient`%).
- `buyFeature` is opt-in per game: `/buy` on a game without the feature ends the session (102).
- Errors by level: ALERT → dialog with OK (retries interrupted auto steps); CRITICAL → "Session over" with reload.
- Tournament start / winner popups, one at a time, dismissed once.
- Money is never a float: arithmetic on BigInt-scaled strings, display via `Intl.NumberFormat` string input, rounded to
  `currencyData.rounding`. Non-ISO currencies (e.g. `USDT`) are shown as `1,234.50 USDT`.

## Crash

- Balance, recent crash points (≥ 2x highlighted), "Connecting… / Reconnecting…" banner while the stream is not live.
- One bet slot per lane the snapshot sent (`Bet`, or `Lane 1…3` for lane games): amount (within `init.bets`), auto
  cash-out (only when the provider has it), and one button that follows the round — `Bet`, `Cancel` (countdown),
  `Cash out <amount × multiplier>` (running), `Cashed out <win>`, `Wait for next round`. Disabled unless the session
  is ready, the stream live and no error is open; the session guards the same rules again.
- Each slot subscribes to its own lane, so a tick re-renders only the slots; the frame re-renders on balance, history
  and bet events. The curve itself is drawn by `@fep/renderer/crash`.
- Live bets (if `capabilities.crash.liveBets`) and top wins (when the server sends them).
- Errors: ALERT → dialog with OK; CRITICAL → "Session over" with reload.

Not yet (crash): my bets list, i18n.

Not yet (slot): autoplay, tournaments list, nickname, settings, i18n (strings are inline English).

```sh
bun nx test hud --coverage
```
