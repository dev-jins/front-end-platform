import { defineConfig } from "vitest/config";

export default defineConfig(() => ({
    root: import.meta.dirname,
    cacheDir: "../../node_modules/.vite/packages/renderer",
    test: {
        name: "renderer",
        watch: false,
        globals: true,
        environment: "node",
        include: ["{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        reporters: ["default"],
        coverage: {
            reportsDirectory: "./test-output/vitest/coverage",
            provider: "v8" as const,
            // Pixi scenes need WebGL: checked in the browser (serve the game apps), not unit tested. Their per-frame
            // logic lives in plain modules that are.
            exclude: ["src/**/*-scene.ts", "src/**/scene/**"],
            thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
        },
    },
}));
