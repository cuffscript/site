// Extracts everything the site needs to know about the CuffScript engine from the
// engine's own source, so that nothing has to be copied by hand when it changes:
// keywords, built-in library functions, error codes.
//
// Source scraping alone can silently miss things (e.g. MathDLC.h registers
// `math_sin` through a helper lambda, not `reg["math_sin"] = ...`), so when a
// built `cuffc` is available every function is also checked against the real binary.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

function readText(file) {
    return fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
}

function walk(dir, ext, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, ext, out);
        else if (entry.name.endsWith(ext)) out.push(full);
    }
    return out;
}

/** Index just past the closing quote of the string/char literal that starts at `i`. */
function skipLiteral(src, i) {
    const quote = src[i];
    let j = i + 1;
    while (j < src.length && src[j] !== quote) j += src[j] === "\\" ? 2 : 1;
    return j + 1;
}

/** Source with C++ line and block comments removed (string and char literals are left intact). */
function stripComments(src) {
    let out = "";
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '"' || ch === "'") {
            const end = skipLiteral(src, i);
            out += src.slice(i, end);
            i = end;
        } else if (ch === "/" && src[i + 1] === "/") {
            const nl = src.indexOf("\n", i);
            i = nl === -1 ? src.length : nl;
        } else if (ch === "/" && src[i + 1] === "*") {
            const close = src.indexOf("*/", i + 2);
            i = close === -1 ? src.length : close + 2;
        } else {
            out += ch;
            i++;
        }
    }
    return out;
}

/** Text between the first "{" at/after `from` and its matching "}" (string/char/comment aware). */
function braceBody(src, from) {
    const open = src.indexOf("{", from);
    if (open === -1) throw new Error("no opening brace");
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        const ch = src[i];
        if (ch === '"' || ch === "'") {
            i = skipLiteral(src, i) - 1;
        } else if (ch === "/" && src[i + 1] === "/") {
            i = src.indexOf("\n", i);
            if (i === -1) break;
        } else if (ch === "/" && src[i + 1] === "*") {
            i = src.indexOf("*/", i) + 1;
        } else if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) return src.slice(open, i + 1);
    }
    throw new Error("unbalanced braces");
}

const unique = (a) => [...new Set(a)];

class EngineSource {
    constructor(dir) {
        this.dir = dir;
        this.engine = path.join(dir, "engine");
        if (!fs.existsSync(this.engine)) throw new Error(`not a CuffScript engine checkout (no engine/ directory): ${dir}`);
        this.files = walk(this.engine, ".h").map((f) => ({ file: f, text: readText(f) }));
    }

    find(re, what) {
        for (const f of this.files) {
            const m = re.exec(f.text);
            if (m) return { ...f, match: m };
        }
        throw new Error(`could not find ${what} in ${this.engine} — the engine layout may have changed; update scripts/lib/engine-meta.mjs`);
    }

    /** body of `inline void register<Name>DLC(...) { ... }` (definition, not the forward declaration) */
    registerBody(name) {
        const cap = name.charAt(0).toUpperCase() + name.slice(1);
        const re = new RegExp(`void\\s+register${cap}DLC\\s*\\([^)]*\\)\\s*\\{`);
        const hit = this.find(re, `register${cap}DLC()`);
        return braceBody(hit.text, hit.match.index);
    }
}

/** reg["name"] = ...   plus   helper("name", ...) for lambdas that assign reg[<variable>]. */
function functionNames(rawBody) {
    const body = stripComments(rawBody); // a commented-out registration is not a function
    const names = new Set([...body.matchAll(/reg\["([A-Za-z_]\w*)"\]\s*=/g)].map((m) => m[1]));
    for (const lm of body.matchAll(/auto\s+(\w+)\s*=\s*\[[^\]]*\]\s*\(/g)) {
        const helper = lm[1];
        const lambdaBody = braceBody(body, lm.index + lm[0].length);
        if (/reg\[\s*[A-Za-z_]\w*\s*\]\s*=/.test(lambdaBody)) {
            for (const call of body.matchAll(new RegExp(`\\b${helper}\\(\\s*"([A-Za-z_]\\w*)"`, "g"))) names.add(call[1]);
        }
    }
    return [...names];
}

export function extractEngineMeta(engineDir) {
    const src = new EngineSource(engineDir);

    const pkgPath = path.join(engineDir, "npm", "package.json");
    const engineVersion = fs.existsSync(pkgPath) ? JSON.parse(readText(pkgPath)).version : "unknown";

    // ---- keywords / types / literals (lexer keyword map)
    const kw = src.find(/keywordMap\s*\(\s*\)\s*\{/, "keywordMap()");
    const kwBody = braceBody(kw.text, kw.match.index);
    const entries = [...kwBody.matchAll(/\{\s*"([^"]+)"\s*,\s*TokenType::([A-Z_]+)\s*\}/g)].map((m) => [m[1], m[2]]);
    if (entries.length < 10) throw new Error("keyword map looks empty — the lexer layout may have changed");
    const types = entries.filter(([, t]) => t.endsWith("_TYPE")).map(([w]) => w);
    const literals = entries.filter(([, t]) => ["TRUE", "FALSE", "EMPTY"].includes(t)).map(([w]) => w);
    const keywords = entries.filter(([, t]) => !t.endsWith("_TYPE") && !["TRUE", "FALSE"].includes(t)).map(([w]) => w);

    // ---- DLC libraries: order and names come from the `use DLC:name` dispatcher
    const disp = src.find(/void\s+registerDLC\s*\(/, "registerDLC()");
    const dispBody = braceBody(disp.text, disp.match.index);
    const dlcNames = unique([...dispBody.matchAll(/libName\s*==\s*"(\w+)"/g)].map((m) => m[1]));
    if (dlcNames.length === 0) throw new Error("no DLC names found in registerDLC()");

    const dlc = {};
    for (const name of dlcNames) dlc[name] = { functions: functionNames(src.registerBody(name)) };

    // ---- always-available functions (no `use` needed)
    const core = src.find(/void\s+registerBuiltins\s*\([^)]*\)\s*\{/, "registerBuiltins()");
    const coreBody = braceBody(core.text, core.match.index);
    const coreBuiltins = functionNames(coreBody);
    for (const m of coreBody.matchAll(/\bregister(\w+)DLC\s*\(\s*reg\s*\)/g)) {
        const lib = m[1].charAt(0).toLowerCase() + m[1].slice(1);
        if (dlc[lib]) coreBuiltins.push(...dlc[lib].functions);
    }

    // ---- error codes
    const ec = src.find(/enum\s+class\s+ErrorCode\s*\{/, "enum class ErrorCode");
    const ecBody = braceBody(ec.text, ec.match.index);
    const errorCodes = [...ecBody.matchAll(/\b([A-Z]\w*)\s*=\s*(\d{4})\b/g)].map((m) => ({ code: `E${m[2]}`, name: m[1] }));
    if (errorCodes.length === 0) throw new Error("no error codes found");

    return {
        $comment: "Generated by scripts/sync-engine.mjs from the engine source. Do not edit by hand.",
        engineVersion,
        keywords,
        types,
        literals,
        coreBuiltins: unique(coreBuiltins),
        dlc,
        errorCodes,
    };
}

// ------------------------------------------------------ verify against cuffc

function runCuffc(cuffc, script) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cuff-probe-"));
    try {
        const file = path.join(dir, "probe.cuff");
        fs.writeFileSync(file, script);
        const r = spawnSync(cuffc, ["--timeout", "5000", file], { cwd: dir, encoding: "utf8" });
        return { code: r.status, stderr: r.stderr ?? "", stdout: r.stdout ?? "" };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const errorTag = (stderr) => /\[(E\d{4})\]/.exec(stderr)?.[1];

/**
 * Calls every function with no arguments. Argument-count validation happens before
 * any side effect, so this is safe even for file_* / network_*; an "undefined
 * function" error (E4002) is the only verdict that means "does not exist".
 * Returns a list of human-readable problems (empty = metadata matches the binary).
 */
export function verifyAgainstBinary(meta, cuffc) {
    const problems = [];

    const control = errorTag(runCuffc(cuffc, "nonexistent_function_for_probe()\n").stderr);
    if (control !== "E4002") problems.push(`probe control failed: expected E4002 for an unknown function, got ${control ?? "no error"}`);

    for (const [name, info] of Object.entries(meta.dlc)) {
        const use = runCuffc(cuffc, `use DLC:${name}\n`);
        if (use.code !== 0) problems.push(`DLC:${name} is not accepted by ${path.basename(cuffc)} (${errorTag(use.stderr) ?? use.stderr.trim()})`);
        for (const fn of info.functions) {
            const r = runCuffc(cuffc, `use DLC:${name}\n${fn}()\n`);
            if (errorTag(r.stderr) === "E4002") problems.push(`${name}: ${fn}() is not a function in the binary (undefined function)`);
        }
    }
    for (const fn of meta.coreBuiltins) {
        if (errorTag(runCuffc(cuffc, `${fn}()\n`).stderr) === "E4002") problems.push(`core: ${fn}() is not available without a DLC`);
    }
    const unknown = runCuffc(cuffc, "use DLC:definitely_not_a_library\n");
    if (errorTag(unknown.stderr) !== "E5004") problems.push("probe control failed: unknown DLC did not raise E5004");
    return problems;
}

// ------------------------------------------------------------------- diffing

export function describeDiff(oldMeta, newMeta) {
    const lines = [];
    const delta = (label, a, b) => {
        const A = new Set(a ?? []);
        const B = new Set(b ?? []);
        const added = [...B].filter((x) => !A.has(x));
        const removed = [...A].filter((x) => !B.has(x));
        if (added.length) lines.push(`${label}: + ${added.join(", ")}`);
        if (removed.length) lines.push(`${label}: - ${removed.join(", ")}`);
    };
    if (oldMeta.engineVersion !== newMeta.engineVersion) lines.push(`engine version: ${oldMeta.engineVersion} -> ${newMeta.engineVersion}`);
    delta("keywords", oldMeta.keywords, newMeta.keywords);
    delta("types", oldMeta.types, newMeta.types);
    delta("literals", oldMeta.literals, newMeta.literals);
    delta("core builtins", oldMeta.coreBuiltins, newMeta.coreBuiltins);
    delta("DLC libraries", Object.keys(oldMeta.dlc ?? {}), Object.keys(newMeta.dlc ?? {}));
    for (const name of unique([...Object.keys(oldMeta.dlc ?? {}), ...Object.keys(newMeta.dlc ?? {})])) {
        delta(`DLC:${name}`, oldMeta.dlc?.[name]?.functions, newMeta.dlc?.[name]?.functions);
    }
    delta("error codes", (oldMeta.errorCodes ?? []).map((e) => `${e.code}=${e.name}`), (newMeta.errorCodes ?? []).map((e) => `${e.code}=${e.name}`));
    return lines;
}
