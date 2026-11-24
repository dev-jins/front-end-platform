/// <reference types='vitest' />
import { nxReadySignal } from "@nx/vite/plugins/nx-ready-signal.plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(() => ({
    root: import.meta.dirname,
    cacheDir: "../../node_modules/.vite/apps/lobby",
    server: {
        port: 4200,
        host: "localhost",
    },
    preview: {
        port: 4201,
        host: "localhost",
    },
    plugins: [react(), nxReadySignal()],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [],
    // },
    build: {
        outDir: "./dist",
        emptyOutDir: true,
        reportCompressedSize: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
    test: {
        name: "lobby",
        watch: false,
        globals: true,
        environment: "jsdom",
        include: ["{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        reporters: ["default"],
        coverage: {
            reportsDirectory: "./test-output/vitest/coverage",
            provider: "v8" as const,
            thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
        },
    },
}));
