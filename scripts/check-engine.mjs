#!/usr/bin/env node
// Verifies that the site's content still works with a given CuffScript engine.
//
//   node scripts/check-engine.mjs [--cuffc path] [--engine dir] [--verbose] [--root site-dir]
//
// Checks (any failure => exit code 1):
//   1. every ```cuff code block in content/**/*.md runs the way its fence says it should
//   2. every IDE example in src/examples runs cleanly
//   3. every library function mentioned in the content (math_*, str_*, ...) exists
//   4. src/engine/webPolicy.json only blocks libraries that exist
//   5. (with --engine) src/generated/engine-meta.json is still up to date
//
// How a code block is judged is set in its fence info string:
//   ```cuff                  must run with exit code 0 and print nothing to stderr
//   ```cuff error=E4006      must fail with that error code (documenting an error on purpose)
//   ```cuff fragment         incomplete snippet (needs surrounding code) - not executed
//   ```cuff skip             not executed (e.g. it would touch the network)
//
// A ```output block placed right after a ```cuff block states what it must print;
// the checker compares it with the real stdout. This catches the quiet failures an
// exit code cannot: a snippet that "works" but prints nothing (or the wrong thing).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { extractCodeBlocks, parseFrontmatter } from "./lib/markdown.mjs";
import { extractEngineMeta, describeDiff } from "./lib/engine-meta.mjs";

const args = process.argv.slice(2);
// --root lets tests point the checker at a deliberately broken copy of the site.
const rootArg = args.includes("--root") ? args[args.indexOf("--root") + 1] : undefined;
const root = path.resolve(rootArg ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const verbose = args.includes("--verbose");
const opt = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : args[i + 1];
};

function findCuffc() {
    const candidates = [opt("--cuffc"), process.env.CUFFC, ...["../cuffscript", "../cuffscript-main"].flatMap((d) => [path.join(root, d, "cuffc"), path.join(root, d, "cuffc.exe")])].filter(Boolean);
    return candidates.map((c) => path.resolve(c)).find((c) => fs.existsSync(c));
}

const cuffc = findCuffc();
if (!cuffc) {
    console.error(
        "check-engine: no cuffc binary found. Build the engine (make) and point at it:\n" +
            "    node scripts/check-engine.mjs --cuffc ../cuffscript/cuffc\n" +
            "  (or set CUFFC=/path/to/cuffc)",
    );
    process.exit(2);
}

const failures = [];
const counts = { run: 0, skipped: 0, outputs: 0, examples: 0, names: 0 };
const fail = (where, msg) => failures.push(`${where}\n      ${msg.replace(/\n/g, "\n      ")}`);

const errorTag = (stderr) => /\[(E\d{4})\]/.exec(stderr)?.[1];
const firstLine = (s) => (s.trim().split("\n")[0] ?? "").slice(0, 160);

function runScript(file, cwd) {
    const r = spawnSync(cuffc, ["--timeout", "8000", file], { cwd, encoding: "utf8", input: "", timeout: 20000 });
    return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", timedOut: r.error?.code === "ETIMEDOUT" };
}

function listMarkdown(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) listMarkdown(full, out);
        else if (e.name.endsWith(".md") && e.name !== "README.md") out.push(full);
    }
    return out.sort();
}

const mdFiles = listMarkdown(path.join(root, "content"));

const normalize = (t) => t.replace(/\r\n?/g, "\n").trimEnd();

for (const file of mdFiles) {
    const rel = path.relative(root, file);
    const blocks = extractCodeBlocks(fs.readFileSync(file, "utf8"), rel);
    blocks.forEach((block, idx) => {
        if (block.lang !== "cuff") return;
        const where = `${rel}:${block.line}`;
        if (block.flags.has("skip") || block.flags.has("fragment")) {
            counts.skipped++;
            return;
        }
        // The ```output block documenting this snippet's result, if it directly follows
        // (at most one blank line between the two fences).
        const next = blocks[idx + 1];
        const documented = next && next.lang === "output" && next.fenceLine - block.endLine <= 2 ? next : undefined;

        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cuff-check-"));
        try {
            const script = path.join(tmp, "snippet.cuff");
            fs.writeFileSync(script, `${block.code}\n`);
            const r = runScript(script, tmp);
            counts.run++;
            const expected = block.attrs.error;
            if (r.timedOut) fail(where, "timed out");
            else if (expected) {
                if (r.code === 0) fail(where, `expected ${expected} but the snippet ran successfully (fence says error=${expected})`);
                else if (errorTag(r.stderr) !== expected) fail(where, `expected ${expected}, got ${errorTag(r.stderr) ?? "no error code"}: ${firstLine(r.stderr)}`);
            } else if (r.code !== 0) {
                fail(where, `exited ${r.code}: ${firstLine(r.stderr)}\n(if this snippet is intentionally partial or erroring, mark its fence: \`\`\`cuff fragment  |  \`\`\`cuff error=Exxxx)`);
            } else if (documented) {
                counts.outputs++;
                if (normalize(r.stdout) !== normalize(documented.code)) {
                    fail(where, `printed something different from the \`\`\`output block at line ${documented.fenceLine}:\n  documented: ${JSON.stringify(normalize(documented.code))}\n  actual:     ${JSON.stringify(normalize(r.stdout))}`);
                }
            }
            if (verbose) console.log(`  ${r.code === 0 ? "ok " : "ERR"} ${where}${documented ? "  (+output)" : ""}`);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    });
}

const exDir = path.join(root, "src/examples");
for (const name of fs.readdirSync(exDir).filter((n) => /^\d+_/.test(n)).sort()) {
    const full = path.join(exDir, name);
    const isDir = fs.statSync(full).isDirectory();
    const entry = isDir ? path.join(full, "main.cuff") : full;
    if (!fs.existsSync(entry)) {
        fail(`src/examples/${name}`, "multi-file example has no main.cuff");
        continue;
    }
    const r = runScript(entry, path.dirname(entry));
    counts.examples++;
    if (r.timedOut) fail(`src/examples/${name}`, "timed out");
    else if (r.code !== 0) fail(`src/examples/${name}`, `exited ${r.code}: ${firstLine(r.stderr)}`);
    if (verbose) console.log(`  ${r.code === 0 ? "ok " : "ERR"} src/examples/${name}`);
}

const meta = JSON.parse(fs.readFileSync(path.join(root, "src/generated/engine-meta.json"), "utf8"));
const known = new Set([...Object.values(meta.dlc).flatMap((d) => d.functions), ...meta.coreBuiltins]);
// A prefix counts as "a library prefix" when at least two functions share it (math_, str_, list_ ...).
const prefixCount = {};
for (const fn of known) {
    const p = fn.includes("_") ? fn.slice(0, fn.indexOf("_")) : null;
    if (p) prefixCount[p] = (prefixCount[p] ?? 0) + 1;
}
const prefixes = Object.keys(prefixCount).filter((p) => prefixCount[p] >= 2);
const nameRe = new RegExp(`(?<![\\w])(?:${prefixes.join("|")})_[a-z0-9_]+(?![\\w])`, "g");

for (const file of mdFiles) {
    const rel = path.relative(root, file);
    const { body, bodyLine } = parseFrontmatter(fs.readFileSync(file, "utf8"), rel);
    body.split("\n").forEach((line, i) => {
        for (const m of line.matchAll(nameRe)) {
            counts.names++;
            if (!known.has(m[0])) fail(`${rel}:${bodyLine + i}`, `"${m[0]}" looks like a library function but the engine has no such function (renamed or removed?)`);
        }
    });
}

const policy = JSON.parse(fs.readFileSync(path.join(root, "src/engine/webPolicy.json"), "utf8"));
for (const name of Object.keys(policy.blockedDlcs ?? {})) {
    if (!(name in meta.dlc)) fail("src/engine/webPolicy.json", `blocks DLC "${name}", which the engine does not have (typo, or the library was removed)`);
}

const engineDir = opt("--engine") ?? [path.join(root, "../cuffscript"), path.join(root, "../cuffscript-main"), path.dirname(cuffc)].find((d) => fs.existsSync(path.join(d, "engine")));
let metaStatus = "not checked (no engine source found; pass --engine <dir>)";
if (engineDir && fs.existsSync(path.join(engineDir, "engine"))) {
    try {
        const fresh = extractEngineMeta(engineDir);
        const diff = describeDiff(meta, fresh);
        if (diff.length) {
            fail("src/generated/engine-meta.json", `out of date relative to the engine at ${engineDir}:\n${diff.map((d) => `  ${d}`).join("\n")}\nrun: node scripts/sync-engine.mjs ${engineDir}`);
            metaStatus = "OUT OF DATE";
        } else metaStatus = `up to date (engine ${fresh.engineVersion})`;
    } catch (err) {
        fail("engine metadata", `could not read the engine source: ${err.message}`);
    }
}

console.log(`cuffc: ${cuffc}`);
console.log(`code blocks run: ${counts.run} (${counts.outputs} with output compared)   skipped (fragment/skip): ${counts.skipped}   examples run: ${counts.examples}   library names checked: ${counts.names}`);
console.log(`engine metadata: ${metaStatus}`);
if (failures.length) {
    console.error(`\n${failures.length} problem(s):\n`);
    for (const f of failures) console.error(`  ✘ ${f}\n`);
    process.exit(1);
}
console.log("\nAll good: the content works with this engine.");
