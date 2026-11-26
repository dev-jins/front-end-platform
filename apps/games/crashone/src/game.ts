import { type CrashSession, createCrashSession } from "@fep/game-core/crash";
import type { LaneId } from "@fep/protocol/crash";
import { type CrashLaneView, createCrashLaneView } from "@fep/renderer/crash";
import { Application } from "pixi.js";

import { createTransport } from "./launch/create-transport";
import { readLaunchConfig } from "./launch/read-launch-config";

/** Space kept free under the curve for the HUD, in CSS pixels. */
const HUD_HEIGHT = 340;
const GAP = 16;

/**
 * Boots the game once, outside React: a second call would run a second game init (for Provider A it rotates the
 * fingerprint and locks out this tab, error 112) — which React StrictMode's double effects would do.
 */
export async function bootGame(host: HTMLElement): Promise<CrashSession> {
    const env = {
        VITE_GATEWAY_URL: import.meta.env.VITE_GATEWAY_URL as string | undefined,
        VITE_API_URL: import.meta.env.VITE_API_URL as string | undefined,
    };
    const transport = createTransport(readLaunchConfig(window.location.search, env, import.meta.env.DEV));
    const app = new Application();
    await app.init({ resizeTo: host, background: "#0b1020", antialias: true });
    host.appendChild(app.canvas);

    const session = createCrashSession({ transport });

    // Lane count comes from init's capabilities: build the views as soon as it lands.
    const unsubscribe = session.store.subscribe(({ init }) => {
        if (!init) return;
        unsubscribe();
        const views: CrashLaneView[] = Array.from({ length: init.capabilities.crash.lanes }, (_, i) =>
            createCrashLaneView({ store: session.store, lane: (i + 1) as LaneId, ticker: app.ticker })
        );
        for (const view of views) app.stage.addChild(view.view);

        const layout = () => {
            const { width, height } = app.screen;
            const rowWidth = views.reduce((sum, view) => sum + view.width, 0) + GAP * (views.length - 1);
            const rowHeight = Math.max(...views.map((view) => view.height));
            const scale = Math.min(1, (width - 32) / rowWidth, (height - HUD_HEIGHT - 32) / rowHeight);
            let x = (width - rowWidth * scale) / 2;
            for (const view of views) {
                view.view.scale.set(scale);
                view.view.position.set(x, Math.max(16, (height - HUD_HEIGHT - rowHeight * scale) / 2));
                x += (view.width + GAP) * scale;
            }
        };
        app.renderer.on("resize", layout);
        layout();
    });

    void session.start();
    return session;
}
