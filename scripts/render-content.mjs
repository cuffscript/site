#!/usr/bin/env node
// Prints a fully rendered page (shell + generated content) without starting Vite.
//   node scripts/render-content.mjs guide          -> stdout
//   node scripts/render-content.mjs home --out dir -> dir/home.html
// Handy for diffing generated HTML in a PR and for quick sanity checks.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyContent, loadContext } from "./lib/content.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = process.argv[2];
const shells = { home: "index.html", guide: "guide/index.html" };
if (!shells[page]) {
    console.error("usage: node scripts/render-content.mjs <home|guide> [--out <dir>]");
    process.exit(2);
}
try {
    const html = applyContent(fs.readFileSync(path.join(root, shells[page]), "utf8"), loadContext(root));
    const outIdx = process.argv.indexOf("--out");
    if (outIdx !== -1) {
        const dir = path.resolve(process.argv[outIdx + 1] ?? ".");
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${page}.html`), html);
        console.log(`wrote ${path.join(dir, `${page}.html`)}`);
    } else {
        process.stdout.write(html);
    }
} catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
}
