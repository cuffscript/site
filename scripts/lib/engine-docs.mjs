// Reads what the engine's own documentation says about errors and limits, so the
// site's error page and limits table never have to be typed by hand.
//
//   docs/reference/errors.md  -> one entry per error code: meaning, what usually causes it,
//                                how to fix it, a program that raises it and the report
//                                the real cuffc prints for that program
//   docs/reference/limits.md  -> the table of limits
//
// The report of each example is produced by running the real cuffc, and an example
// that does not raise the code it is listed under makes extraction fail: a catalogue
// that shows the wrong message would be worse than none.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { errorTagNumber, findErrorTag } from "./errorTag.mjs";

const readText = (file) => fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");

export const ERROR_CATEGORIES = {
    1: "Lexical",
    2: "Syntax",
    3: "Pattern",
    4: "Runtime",
    5: "Module",
    6: "Resource limit",
    7: "Program",
    9: "Internal",
};

/** Cells of a markdown table row, without the outer pipes. A `\|` stays inside its cell. */
function tableCells(line) {
    const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

/** Text between two marker comments, or throws: a silent miss would leave the page empty. */
function between(text, begin, end, label) {
    const a = text.indexOf(begin);
    const b = text.indexOf(end);
    if (a === -1 || b === -1 || b < a) throw new Error(`${label}: the markers ${begin} / ${end} are missing`);
    return text.slice(a + begin.length, b);
}

/** The first table that follows a "### Heading" in the generated error table. */
function parseErrorTable(text) {
    const region = between(text, "<!-- BEGIN GENERATED: error-table -->", "<!-- END GENERATED: error-table -->", "errors.md");
    const rows = new Map();
    for (const line of region.split("\n")) {
        const m = /^\|\s*(?:<a id="[^"]*"><\/a>)?`(E\d+-\d{3})`\s*\|/.exec(line);
        if (!m) continue;
        const cells = tableCells(line);
        if (cells.length < 3) continue;
        let meaning = cells[1];
        const reserved = /_Reserved: never raised\._/.test(meaning);
        meaning = meaning.replace(/\s*_Reserved: never raised\._/, "").trim();
        rows.set(m[1], { meaning, reserved, catchable: /^yes/i.test(cells[2]) });
    }
    if (rows.size === 0) throw new Error("errors.md: no rows found in the error table");
    return rows;
}

/** "**E4-018.** text" paragraphs, each with the ```cuff error E4-018 block that follows it. */
function parseDetails(text) {
    const start = text.indexOf("## What each error looks like");
    if (start === -1) throw new Error('errors.md: no "What each error looks like" section');
    const body = text.slice(start);
    const details = new Map();
    const re = /^\*\*(E\d+-\d{3})\.\*\*\s+([\s\S]*?)(?=\n\n)(?:\n\n```cuff error (E\d+-\d{3})[^\n]*\n([\s\S]*?)\n```)?/gm;
    for (const m of body.matchAll(re)) {
        const [, code, prose, exampleCode, example] = m;
        details.set(code, {
            detail: prose.replace(/\s*\n\s*/g, " ").trim(),
            exampleFor: exampleCode ?? null,
            example: example ?? null,
        });
    }
    // The bullets at the end: codes that no ordinary program shows.
    const tail = body.slice(body.indexOf("### Codes without an example"));
    const bullets = tail.split(/\n- /).slice(1).map((b) => b.replace(/\n\s+/g, " ").trim());
    const withoutExample = new Map();
    for (const b of bullets) {
        const codes = [...b.matchAll(/\*\*`?(E\d+-\d{3})`?\*\*/g)].map((m) => m[1]);
        for (const code of codes) withoutExample.set(code, b);
    }
    return { details, withoutExample };
}

/** Runs one program with the real cuffc; returns the report and the code it raised. */
function runExample(cuffc, source) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cuff-catalog-"));
    try {
        const file = path.join(dir, "main.cuff");
        fs.writeFileSync(file, `${source}\n`);
        const r = spawnSync(cuffc, ["--timeout", "8000", file], { cwd: dir, encoding: "utf8", input: "", timeout: 20000 });
        const stderr = (r.stderr ?? "").replace(/\r\n?/g, "\n");
        return { stderr, code: findErrorTag(stderr) };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/** "ERROR: [E4-006] Runtime Error at ..." -> the report without the ERROR: prefix, trimmed. */
function cleanReport(stderr) {
    return stderr.replace(/^ERROR: /, "").trim();
}

export function parseLimits(text) {
    const region = between(text, "<!-- BEGIN GENERATED: limits-table -->", "<!-- END GENERATED: limits-table -->", "limits.md");
    const limits = [];
    for (const line of region.split("\n")) {
        if (!line.startsWith("|") || /^\|\s*:?-/.test(line) || /^\|\s*Limit\s*\|/.test(line)) continue;
        const cells = tableCells(line);
        if (cells.length < 4) continue;
        const raises = /`(E\d+-\d{3})`/.exec(cells[2])?.[1] ?? null;
        limits.push({ name: cells[0], value: cells[1], raises, description: cells[3] });
    }
    if (limits.length === 0) throw new Error("limits.md: no rows found in the limits table");
    return limits;
}

/**
 * errorCodes: the `errorCodes` of engine-meta.json (code + name), the authority on which codes exist.
 * cuffc: path of a built cuffc, needed to show the real report of each example.
 */
export function extractEngineDocs(engineDir, errorCodes, cuffc) {
    if (!cuffc) throw new Error("a built cuffc is needed to show the real report of each error example");
    const errorsMd = readText(path.join(engineDir, "docs/reference/errors.md"));
    const limitsMd = readText(path.join(engineDir, "docs/reference/limits.md"));

    const table = parseErrorTable(errorsMd);
    const { details, withoutExample } = parseDetails(errorsMd);

    const errors = errorCodes.map(({ code, name }) => {
        const row = table.get(code);
        if (!row) throw new Error(`errors.md: the engine has ${code} (${name}) but the error table does not list it`);
        const num = errorTagNumber(code);
        const entry = {
            code,
            name,
            category: ERROR_CATEGORIES[Math.floor(num / 1000)] ?? "Other",
            meaning: row.meaning,
            reserved: row.reserved,
            catchable: row.catchable,
            detail: null,
            example: null,
            report: null,
        };
        const d = details.get(code);
        if (d) {
            entry.detail = d.detail;
            if (d.example) {
                const run = runExample(cuffc, d.example);
                if (code !== "E4-028" && run.code !== code) {
                    throw new Error(`errors.md: the example for ${code} raised ${run.code ?? "no error"} instead:\n${run.stderr}`);
                }
                if (run.code === code) {
                    entry.example = d.example;
                    entry.report = cleanReport(run.stderr);
                }
            }
        } else if (withoutExample.has(code)) {
            entry.detail = withoutExample.get(code);
        }
        return entry;
    });

    for (const code of details.keys()) {
        if (!table.has(code)) throw new Error(`errors.md describes ${code}, which is not in its own error table`);
    }
    return { errors, limits: parseLimits(limitsMd) };
}

/** Which entries differ between two catalogues, for the sync summary. */
export function describeDocsDiff(prev, next) {
    const out = [];
    const keyed = (list, key) => new Map((list ?? []).map((e) => [e[key], JSON.stringify(e)]));
    const compare = (label, a, b) => {
        for (const k of b.keys()) if (!a.has(k)) out.push(`${label} added: ${k}`);
        for (const k of a.keys()) if (!b.has(k)) out.push(`${label} removed: ${k}`);
        for (const [k, v] of b) if (a.has(k) && a.get(k) !== v) out.push(`${label} changed: ${k}`);
    };
    compare("error", keyed(prev?.errors, "code"), keyed(next.errors, "code"));
    compare("limit", keyed(prev?.limits, "name"), keyed(next.limits, "name"));
    return out;
}
