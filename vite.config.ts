import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const htmlEntry = (name: string) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
    root,
    assetsInclude: ["**/*.wasm"],
    worker: {
        format: "es",
    },
    optimizeDeps: {
        exclude: ["cuffscript-wasm"],
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
