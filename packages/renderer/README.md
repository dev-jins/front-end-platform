# @fep/renderer

PixiJS v8 rendering, no React. Per-frame motion is imperative and driven by the Pixi ticker; React never re-renders per frame.

| Entry point          | What                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `@fep/renderer/slot` | `createSlotScene`, `connectSpinView`, `ReelSetMotion` / `ReelMotion`, `winLineCells`, `reelColumns` |

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

```sh
bun nx test renderer --coverage
```
