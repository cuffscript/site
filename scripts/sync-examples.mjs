#!/usr/bin/env node
// Replaces the IDE examples (src/examples) with the engine's numbered example programs.
//   npm run sync:examples [-- <engine-dir>]
// A program that loads a module (`use name from ./dir`) becomes a folder project: main.cuff plus that folder.
// A program that needs a library the browser IDE blocks (webPolicy.json) is skipped.
// Menu labels in labels.json are kept for examples that still exist; new ones get a label made from the file name.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { engineCandidates } from "./lib/engine-dir.mjs";

const label = (slug) => {
    const [, n, name] = /^(\d+)_(.*)$/.exec(slug);
    const words = name.replace(/_/g, " ");
    return `${Number(n)}. ${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

function copyCuffFiles(from, to) {
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const src = path.join(from, entry.name);
        if (entry.isDirectory()) copyCuffFiles(src, path.join(to, entry.name));
        else if (entry.name.endsWith(".cuff")) {
            fs.mkdirSync(to, { recursive: true });
            fs.copyFileSync(src, path.join(to, entry.name));
        }
    }
}

export function syncExamples({ from, to, blocked, labelsFile }) {
    const programs = fs.readdirSync(from).filter((n) => /^\d+_.+\.cuff$/.test(n)).sort();
    if (programs.length === 0) throw new Error(`no numbered .cuff programs in ${from}`);
    for (const n of fs.readdirSync(to)) if (/^\d+_/.test(n)) fs.rmSync(path.join(to, n), { recursive: true, force: true });

    const kept = [];
    const skipped = [];
    for (const file of programs) {
        const slug = file.replace(/\.cuff$/, "");
        const text = fs.readFileSync(path.join(from, file), "utf8");
        const useLines = text.split("\n").filter((l) => /^use\s/.test(l));
        const dlcs = useLines.flatMap((l) => [...l.matchAll(/DLC:(\w+)/g)].map((m) => m[1]));
        const blockedDlc = dlcs.find((d) => d in blocked);
        if (blockedDlc) {
            skipped.push(`${slug} (uses DLC:${blockedDlc}, blocked in the browser)`);
            continue;
        }
        const modules = useLines.map((l) => /^use\s+\w+\s+from\s+(\S+)/.exec(l)?.[1]).filter(Boolean);
        if (modules.length === 0) {
            fs.writeFileSync(path.join(to, file), text);
        } else {
            const dir = path.join(to, slug);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, "main.cuff"), text);
            for (const rel of modules) copyCuffFiles(path.join(from, rel), path.join(dir, rel));
        }
        kept.push(slug);
    }

    const old = fs.existsSync(labelsFile) ? JSON.parse(fs.readFileSync(labelsFile, "utf8")) : {};
    const labels = Object.fromEntries(kept.map((slug) => [slug, old[slug] ?? label(slug)]));
    fs.writeFileSync(labelsFile, JSON.stringify(labels, null, 4) + "\n");
    return { kept, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const dir = engineCandidates(root, process.argv[2]).map((d) => path.resolve(d)).find((d) => fs.existsSync(path.join(d, "examples")));
    if (!dir) {
        console.error("no engine checkout with an examples/ folder found; pass its path, or set CUFFSCRIPT_ENGINE");
        process.exit(1);
    }
    const blocked = JSON.parse(fs.readFileSync(path.join(root, "src/engine/webPolicy.json"), "utf8")).blockedDlcs;
    const { kept, skipped } = syncExamples({ from: path.join(dir, "examples"), to: path.join(root, "src/examples"), blocked, labelsFile: path.join(root, "src/examples/labels.json") });
    console.log(`examples from ${dir}\n  copied ${kept.length}: ${kept.join(", ")}`);
    for (const s of skipped) console.log(`  skipped ${s}`);
    console.log("Next: check the menu names in src/examples/labels.json, then run: npm run check:engine");
}
