// Tests src/examples/discover.ts (run directly by Node) and the real examples folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

let mod;
try {
    mod = await import("../../src/examples/discover.ts");
} catch (err) {
    if (err?.code !== "ERR_UNKNOWN_FILE_EXTENSION") throw err;
}
const t = (name, fn) => test(name, { skip: !mod && "this Node version cannot execute .ts directly" }, fn);

t("single files and folders become projects, ordered by their numeric prefix", () => {
    const raw = {
        "./10_big/main.cuff": "m10",
        "./10_big/maps/stage.cuff": "s",
        "./02_second.cuff": "two",
        "./1_first.cuff": "one",
        "./09_modules/lib/g.cuff": "g",
        "./09_modules/main.cuff": "m9",
    };
    const ex = mod.buildExamples(raw, { "02_second": "2. 둘째" });
    assert.deepEqual(ex.map((e) => e.id), ["first", "second", "modules", "big"]);
    assert.equal(ex[1].label, "2. 둘째");
    assert.equal(ex[0].label, "1. first"); // no entry in labels -> derived
    assert.deepEqual(ex[0].files, [{ path: "main.cuff", content: "one" }]);
    assert.deepEqual(ex[2].files.map((f) => f.path), ["main.cuff", "lib/g.cuff"]); // entry first
    assert.ok(ex.every((e) => e.entryPath === "main.cuff"));
});

t("a folder without main.cuff is a loud error, not a broken menu entry", () => {
    assert.throws(() => mod.buildExamples({ "./05_x/a.cuff": "" }, {}), /has no main\.cuff/);
});

t("the shipped examples folder: no orphaned labels (a typo'd key would silently do nothing)", () => {
    const dir = new URL("../../src/examples/", import.meta.url).pathname;
    const labels = JSON.parse(fs.readFileSync(path.join(dir, "labels.json"), "utf8"));
    const slugs = fs.readdirSync(dir).filter((n) => /^\d+_/.test(n)).map((n) => n.replace(/\.cuff$/, ""));
    assert.ok(slugs.length >= 1);
    // A missing label is fine (the menu falls back to the folder name); an unused one is a typo.
    for (const k of Object.keys(labels)) assert.ok(slugs.includes(k), `labels.json mentions "${k}" but no such example exists`);
});
