import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { engineCanShowBytecode } from "../lib/engine-features.mjs";

function projectWithWasm(bytes) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "features-"));
    const dist = path.join(root, "node_modules/cuffscript-wasm/dist");
    fs.mkdirSync(dist, { recursive: true });
    if (bytes) fs.writeFileSync(path.join(dist, "cuffscript.wasm"), bytes);
    return root;
}

test("a build that exports cuffBytecode can show bytecode", () => {
    assert.equal(engineCanShowBytecode(projectWithWasm(Buffer.from("\0asm...cuffRun\0cuffDump\0cuffBytecode\0..."))), true);
});

test("a build with only cuffRun and cuffDump cannot", () => {
    assert.equal(engineCanShowBytecode(projectWithWasm(Buffer.from("\0asm...cuffRun\0cuffDump\0..."))), false);
});

test("a missing package is treated as not supported, not as an error", () => {
    assert.equal(engineCanShowBytecode(projectWithWasm(null)), false);
});
