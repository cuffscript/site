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
                main: htmlEntry("index.html"),
                guide: htmlEntry("guide.html"),
            },
        },
    },
});
