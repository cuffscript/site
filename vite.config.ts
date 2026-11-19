import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import cuffContent from "./scripts/vite-plugin-content.mjs";
import { engineCanShowBytecode } from "./scripts/lib/engine-features.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const htmlEntry = (name: string) => fileURLToPath(new URL(name, import.meta.url));

const CROSS_ORIGIN_ISOLATION_HEADERS = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
    root,
    // Generates the guide / home page content from content/**/*.md (see README).
    plugins: [cuffContent()],
    assetsInclude: ["**/*.wasm"],
    // The IDE offers "View bytecode" only when the installed engine build can do it.
    define: { __CUFF_BYTECODE__: JSON.stringify(engineCanShowBytecode(root)) },
    worker: {
        format: "es",
    },
    optimizeDeps: {
        exclude: ["cuffscript-wasm"],
    },
    // Cross-origin isolation unlocks SharedArrayBuffer + Atomics.wait, which
    // the IDE uses for real-time input() prompts (see src/engine/stdinChannel.ts).
    // Production needs the equivalent in public/_headers (see that file).
    server: {
        headers: CROSS_ORIGIN_ISOLATION_HEADERS,
    },
    preview: {
        headers: CROSS_ORIGIN_ISOLATION_HEADERS,
    },
    build: {
        rollupOptions: {
            input: {
                home: htmlEntry("index.html"),
                ide: htmlEntry("ide/index.html"),
                guide: htmlEntry("guide/index.html"),
            },
        },
    },
});
