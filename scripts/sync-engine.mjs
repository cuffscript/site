#!/usr/bin/env node
// Regenerates src/generated/engine-meta.json from a CuffScript engine checkout.
//
//   node scripts/sync-engine.mjs [engine-dir] [--cuffc path] [--build] [--check] [--clone[=ref]]
//
//   engine-dir   a checkout of the engine repo (default: $CUFFSCRIPT_ENGINE, ../cuffscript, ../cuffscript-main)
//   --clone[=ref] shallow-clone the engine from GitHub instead (needs git + network)
//   --cuffc      a built cuffc to verify against (default: <engine-dir>/cuffc if it exists)
//   --build      run `make` in the engine dir first, to get a cuffc to verify against
//   --check      don't write; exit 1 if the committed file is out of date (for CI)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { extractEngineMeta, verifyAgainstBinary, describeDiff } from "./lib/engine-meta.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "src/generated/engine-meta.json");
const siteConfig = JSON.parse(fs.readFileSync(path.join(root, "src/siteConfig.json"), "utf8"));

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === name || a.startsWith(`${name}=`));
const value = (name) => {
    const i = args.findIndex((a) => a === name || a.startsWith(`${name}=`));
    if (i === -1) return undefined;
    const a = args[i];
    return a.includes("=") ? a.slice(a.indexOf("=") + 1) : args[i + 1];
};
const positional = args.filter((a, i) => !a.startsWith("--") && !(args[i - 1] === "--cuffc"))[0];

function fail(msg) {
    console.error(`sync-engine: ${msg}`);
    process.exit(1);
}

function resolveEngineDir() {
    if (flag("--clone")) {
        const ref = value("--clone");
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cuffscript-engine-"));
        const cloneArgs = ["clone", "--depth", "1", ...(ref ? ["--branch", ref] : []), `https://github.com/${siteConfig.repo}.git`, tmp];
        console.log(`cloning ${siteConfig.repo}${ref ? `@${ref}` : ""} ...`);
        const r = spawnSync("git", cloneArgs, { stdio: "inherit" });
        if (r.status !== 0) fail("git clone failed");
        return tmp;
    }
    const candidates = [positional, process.env.CUFFSCRIPT_ENGINE, path.join(root, "../cuffscript"), path.join(root, "../cuffscript-main")].filter(Boolean);
    const found = candidates.find((c) => fs.existsSync(path.join(c, "engine")));
    if (!found) {
        fail(
            "no engine checkout found. Pass one explicitly:\n" +
                "    node scripts/sync-engine.mjs ../cuffscript\n" +
                "  or clone it automatically:\n" +
                "    node scripts/sync-engine.mjs --clone",
        );
    }
    return found;
}

const engineDir = path.resolve(resolveEngineDir());

if (flag("--build")) {
    console.log("building cuffc (make) ...");
    const r = spawnSync("make", [], { cwd: engineDir, stdio: "inherit" });
    if (r.status !== 0) fail("make failed — pass --cuffc <path> instead, or omit --build to skip verification");
}

let cuffc = value("--cuffc");
if (!cuffc) for (const n of ["cuffc", "cuffc.exe"]) if (fs.existsSync(path.join(engineDir, n))) cuffc = path.join(engineDir, n);

let meta;
try {
    meta = extractEngineMeta(engineDir);
} catch (err) {
    fail(err.message);
}

if (cuffc) {
    const problems = verifyAgainstBinary(meta, path.resolve(cuffc));
    if (problems.length) {
        console.error("The extracted metadata disagrees with the real cuffc binary:");
        for (const p of problems) console.error(`  - ${p}`);
        fail("refusing to write unverified metadata (fix scripts/lib/engine-meta.mjs or the engine)");
    }
    const fnCount = Object.values(meta.dlc).reduce((n, d) => n + d.functions.length, 0);
    console.log(`verified against ${path.basename(cuffc)}: ${Object.keys(meta.dlc).length} libraries, ${fnCount} functions all exist`);
} else {
    console.warn("warning: no cuffc binary found — function names are NOT verified against the real engine.\n         Build it (make) and pass --cuffc, or use --build.");
}

const next = `${JSON.stringify(meta, null, 2)}\n`;
const prev = fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8") : null;
const diff = prev ? describeDiff(JSON.parse(prev), meta) : ["(no previous file)"];

if (flag("--check")) {
    if (prev === next) {
        console.log(`engine-meta.json is up to date with engine ${meta.engineVersion}`);
        process.exit(0);
    }
    console.error("src/generated/engine-meta.json is OUT OF DATE relative to the engine:");
    for (const l of diff) console.error(`  ${l}`);
    console.error("Run: node scripts/sync-engine.mjs <engine-dir>   then review content/ for anything affected.");
    process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, next);
console.log(prev === next ? `engine-meta.json unchanged (engine ${meta.engineVersion})` : `wrote ${path.relative(root, outFile)} (engine ${meta.engineVersion})`);
if (prev !== next) for (const l of diff) console.log(`  ${l}`);
