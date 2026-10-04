// Proves the engine checker actually catches stale content, by running it against
// deliberately broken copies of the site. Needs a built cuffc: set CUFFC=/path/to/cuffc
// (or build ../cuffscript). Skipped otherwise, so `npm test` still works without an engine.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const candidates = [process.env.CUFFC, path.join(root, "../cuffscript/cuffc"), path.join(root, "../cuffscript-main/cuffc")].filter(Boolean);
const cuffc = candidates.find((c) => fs.existsSync(c));
const skip = !cuffc && "no cuffc binary (set CUFFC to run these)";

function brokenCopy(mutate) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "site-broken-"));
    fs.cpSync(path.join(root, "content"), path.join(dir, "content"), { recursive: true });
    fs.cpSync(path.join(root, "src"), path.join(dir, "src"), { recursive: true });
    mutate(dir);
    return dir;
}
function check(dir) {
    // no --engine: metadata freshness is covered separately below
    const r = spawnSync(process.execPath, [path.join(root, "scripts/check-engine.mjs"), "--root", dir, "--cuffc", cuffc, "--engine", "/nonexistent"], { encoding: "utf8" });
    return { code: r.status, text: `${r.stdout}\n${r.stderr}` };
}
const patch = (dir, rel, fn) => {
    const f = path.join(dir, rel);
    fs.writeFileSync(f, fn(fs.readFileSync(f, "utf8")));
};

test("the real site passes against the real engine", { skip }, () => {
    const r = check(root);
    assert.equal(r.code, 0, r.text);
});

test("catches a snippet that still uses a pre-3.0 function name", { skip }, () => {
    const dir = brokenCopy((d) => patch(d, "content/guide/07-modules.md", (s) => s.replace("print(math_sqrt(16))", "print(sqrt(16))")));
    const r = check(dir);
    assert.equal(r.code, 1);
    assert.match(r.text, /undefined function 'sqrt'/);
});

test("catches a documented output that no longer matches what the engine prints", { skip }, () => {
    const dir = brokenCopy((d) => patch(d, "content/guide/06-patterns.md", (s) => s.replace("```output\nT-123", "```output\nT-000")));
    const r = check(dir);
    assert.equal(r.code, 1);
    assert.match(r.text, /printed something different from the ```output block/);
});

test("catches prose that mentions a library function the engine does not have", { skip }, () => {
    const dir = brokenCopy((d) => patch(d, "content/guide/04-functions.md", (s) => s.replace("## 함수 정의 {#functions}\n", "## 함수 정의 {#functions}\n\n`math_squareroot` 를 쓰세요.\n")));
    const r = check(dir);
    assert.equal(r.code, 1);
    assert.match(r.text, /"math_squareroot" looks like a library function/);
});

test("catches a web policy that blocks a library that does not exist", { skip }, () => {
    const dir = brokenCopy((d) => patch(d, "src/engine/webPolicy.json", (s) => JSON.stringify({ blockedDlcs: { ...JSON.parse(s).blockedDlcs, filesytem: "typo" } })));
    const r = check(dir);
    assert.equal(r.code, 1);
    assert.match(r.text, /blocks DLC "filesytem"/);
});

test("catches an intentionally-erroring snippet that stopped erroring", { skip }, () => {
    const dir = brokenCopy((d) => patch(d, "content/guide/05-errors.md", (s) => s.replace("```cuff error=E4006\nset number a to 10\nset number b to 0\nprint(a / b)", "```cuff error=E4006\nset number a to 10\nset number b to 5\nprint(a / b)")));
    const r = check(dir);
    assert.equal(r.code, 1);
    assert.match(r.text, /expected E4006 but the snippet ran successfully/);
});
