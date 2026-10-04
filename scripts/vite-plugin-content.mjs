// Vite plugin: fills the <!--@guide:...--> / <!--@home:...--> placeholders in the
// page shells (index.html, guide/index.html) with HTML generated from content/**/*.md.
// All the logic lives in scripts/lib/content.mjs so it can be tested without Vite.
import path from "node:path";
import { applyContent, loadContext } from "./lib/content.mjs";

// Anything that can change the generated pages. Editing any of these while
// `npm run dev` is running triggers a full reload.
const WATCHED = ["content", "src/generated", "src/siteConfig.json", "src/engine/webPolicy.json", "src/examples"];

export default function cuffContent() {
    let root = process.cwd();
    return {
        name: "cuff-content",

        configResolved(config) {
            root = config.root;
        },

        configureServer(server) {
            const targets = WATCHED.map((p) => path.join(root, p));
            server.watcher.add(targets);
            const reload = (file) => {
                if (targets.some((t) => path.resolve(file).startsWith(t))) server.ws.send({ type: "full-reload" });
            };
            server.watcher.on("change", reload);
            server.watcher.on("add", reload);
            server.watcher.on("unlink", reload);
        },

        transformIndexHtml: {
            order: "pre",
            handler(html) {
                try {
                    return applyContent(html, loadContext(root));
                } catch (err) {
                    // A bad include / unknown variable / unclosed fence fails the build with file:line.
                    throw new Error(`[cuff-content] ${err instanceof Error ? err.message : String(err)}`, { cause: err });
                }
            },
        },
    };
}
