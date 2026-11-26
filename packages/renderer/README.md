# @fep/renderer

PixiJS v8 rendering, no React. Per-frame motion is imperative and driven by the Pixi ticker; React never re-renders per frame.

| Entry point          | What                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `@fep/renderer/slot` | `createSlotScene`, `connectSpinView`, `ReelSetMotion` / `ReelMotion`, `winLineCells`, `reelColumns` |
| `@fep/renderer/crash` | `createCrashLaneView`, `toCrashFrame`, `TickInterpolator`, `CurveTrace`, `curveViewport`, `toScreenPoint` |

## Slot scene

```ts
const scene = createSlotScene({ params: init.slot.params, ticker: app.ticker });
app.stage.addChild(scene.view);
scene.show(displayed.state); // restore lastSpin
connectSpinView(session.store, scene); // spin on click, land back on errors
// session option: present: (round) => scene.present(round.state)
```

- `reel-motion.ts` — reel scrolling and stop scheduling (min spin time, left-to-right stops) as plain state; unit tested.
- `win-lines.ts` — payline → cells (1-based API rows → 0-based, `normal` / `reverse`); unit tested.
- `slot-scene.ts` — draws the above with Pixi. Placeholder tiles (color + symbol name) until per-game atlases exist.
  Not unit tested (needs WebGL); check it in the browser with `bun run serve:gameone`.

## Crash lane view

```ts
const session = createCrashSession({ transport });
await session.start();
const lane1 = createCrashLaneView({ store: session.store, lane: 1, ticker: app.ticker });
app.stage.addChild(lane1.view); // lane games: one view per lane, placed by the game app
```

- Reads the store every frame with `getState()`; React never re-renders for the curve.
- `to-crash-frame.ts` — what a lane shows this frame: countdown time left, the multiplier while running (`exp` curve:
  `e^(k·t)` from `startAt` on the server clock, never below the last tick; ticks only: one tick behind), the crash
  point after the crash. Unit tested.
- `tick-interpolator.ts` — ticks-only providers: eases from the previous tick to the latest over the gap between them,
  so the curve never shows a value the server has not sent. Unit tested.
- `curve-trace.ts`, `curve-viewport.ts`, `to-screen-point.ts` — the curve as drawn this round (one point per 50 ms
  plus an exact head), auto-zoom with headroom, curve → pixels. Unit tested.
- `create-crash-lane-view.ts` — draws the above with Pixi: curve, object at the tip, big multiplier, countdown /
  crashed caption, the player's cash-out marker. Placeholder look until per-game art exists. Not unit tested (needs
  WebGL).

```sh
bun nx test renderer --coverage
```
