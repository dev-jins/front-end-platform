# @fep/hud

React HUD over the game canvas. Reads the game-core store and sends intents; never calls the API.

| Entry point     | What                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| `@fep/hud/slot` | `SlotHud`, money helpers (`formatMoney`, `multiplyMoney`, `percentOf`) |

```tsx
<SlotHud session={session} buyFeature={false} />
```

- Balance, win, bet stepper with total bet (bet × lines), spin, optional buy bonus (price = total bet × `bonusCoefficient`%).
- `buyFeature` is opt-in per game: `/buy` on a game without the feature ends the session (102).
- Errors by level: ALERT → dialog with OK (retries interrupted auto steps); CRITICAL → "Session over" with reload.
- Tournament start / winner popups, one at a time, dismissed once.
- Money is never a float: arithmetic on BigInt-scaled strings, display via `Intl.NumberFormat` string input, rounded to
  `currencyData.rounding`. Non-ISO currencies (e.g. `USDT`) are shown as `1,234.50 USDT`.

Not yet: autoplay, tournaments list, nickname, settings, i18n (strings are inline English).

```sh
bun nx test hud --coverage
```
