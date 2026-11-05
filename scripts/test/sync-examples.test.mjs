import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncExamples } from "../sync-examples.mjs";

function setup() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sync-examples-"));
    const from = path.join(tmp, "engine");
    const to = path.join(tmp, "site");
    fs.mkdirSync(path.join(from, "lib"), { recursive: true });
    fs.mkdirSync(to);
    fs.writeFileSync(path.join(from, "01_hello.cuff"), 'print("hi")\n');
    fs.writeFileSync(path.join(from, "02_files.cuff"), "use DLC:math, DLC:filesystem\n");
    fs.writeFileSync(path.join(from, "03_modules_demo.cuff"), "use greet from ./lib\nprint(greet())\n");
    fs.writeFileSync(path.join(from, "lib", "greet.cuff"), "func greet() do: return 1 end\n");
    fs.writeFileSync(path.join(from, "README.md"), "not an example");
    fs.writeFileSync(path.join(to, "09_old.cuff"), "old\n");
    fs.writeFileSync(path.join(to, "labels.json"), JSON.stringify({ "01_hello": "1. Hello World", "09_old": "9. Old" }));
    return { from, to, labelsFile: path.join(to, "labels.json") };
}

test("copies programs, turns module users into folders, skips blocked libraries, replaces the old ones", () => {
    const dirs = setup();
    const { kept, skipped } = syncExamples({ ...dirs, blocked: { filesystem: "no" } });
    assert.deepEqual(kept, ["01_hello", "03_modules_demo"]);
    assert.equal(skipped.length, 1);
    assert.match(skipped[0], /02_files.*filesystem/);
    assert.ok(fs.existsSync(path.join(dirs.to, "01_hello.cuff")));
    assert.ok(!fs.existsSync(path.join(dirs.to, "02_files.cuff")));
    assert.ok(!fs.existsSync(path.join(dirs.to, "09_old.cuff")));
    assert.ok(fs.existsSync(path.join(dirs.to, "03_modules_demo", "main.cuff")));
    assert.ok(fs.existsSync(path.join(dirs.to, "03_modules_demo", "lib", "greet.cuff")));
});

test("labels: existing ones are kept, new ones are made from the name, removed examples lose theirs", () => {
    const dirs = setup();
    syncExamples({ ...dirs, blocked: {} });
    const labels = JSON.parse(fs.readFileSync(dirs.labelsFile, "utf8"));
    assert.equal(labels["01_hello"], "1. Hello World");
    assert.equal(labels["03_modules_demo"], "3. Modules demo");
    assert.ok(!("09_old" in labels));
});
