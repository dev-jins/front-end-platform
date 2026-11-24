import { Application } from "pixi.js";

import { type SlotSession, createSlotSession, standardStateAdapter } from "@fep/game-core/slot";
import { type GameState, createSlotHttpTransport } from "@fep/protocol/slot";
import { type SlotScene, connectSpinView, createSlotScene } from "@fep/renderer/slot";

import { createMockTransport } from "./dev/mock-transport";

/** Space kept free under the reels for the HUD, in CSS pixels. */
const HUD_HEIGHT = 140;

function createTransportFactory() {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const sessionKey = new URLSearchParams(window.location.search).get("sessionKey");
  if (apiUrl && sessionKey) {
    return {
      sessionKey,
      createTransport: (key: string) => createSlotHttpTransport({ baseUrl: apiUrl, sessionKey: key }),
    };
  }
  const mock = createMockTransport();
  return { sessionKey: "mock", createTransport: () => mock };
}

/**
 * Boots the game once, outside React: a second call would run a second game init, rotate the fingerprint and lock
 * out this tab (error 112) — which React StrictMode's double effects would do.
 */
export async function bootGame(host: HTMLElement): Promise<SlotSession<GameState>> {
  const app = new Application();
  await app.init({ resizeTo: host, background: "#0b1020", antialias: true });
  host.appendChild(app.canvas);

  let resolveScene: (scene: SlotScene) => void = () => undefined;
  const sceneReady = new Promise<SlotScene>((resolve) => (resolveScene = resolve));

  const session = createSlotSession({
    ...createTransportFactory(),
    adapter: standardStateAdapter,
    // A reload into freespins resumes before the scene exists; wait for it.
    present: async (round) => (await sceneReady).present(round.state),
  });

  // The scene needs init's slot params, but start() only resolves after resumed auto steps,
  // which need the scene: build it as soon as init lands.
  const unsubscribe = session.store.subscribe(({ init, displayed }) => {
    if (!init || !displayed) return;
    unsubscribe();
    const scene = createSlotScene({ params: init.slot.params, ticker: app.ticker });
    scene.show(displayed.state);
    app.stage.addChild(scene.view);
    connectSpinView(session.store, scene);

    const layout = () => {
      const { width, height } = app.screen;
      const scale = Math.min(1, (width - 32) / scene.width, (height - HUD_HEIGHT - 32) / scene.height);
      scene.view.scale.set(scale);
      scene.view.position.set((width - scene.width * scale) / 2, (height - HUD_HEIGHT - scene.height * scale) / 2);
    };
    app.renderer.on("resize", layout);
    layout();
    resolveScene(scene);
    void session.loaded();
  });

  void session.start();
  return session;
}
