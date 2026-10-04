// Tests the real TypeScript source (src/engine/dlcPolicy.ts), executed directly by Node.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

let policy;
try {
    policy = await import("../../src/engine/dlcPolicy.ts");
} catch (err) {
    // Node < 22.18 can't run .ts files without a flag; skip rather than fail the suite.
    if (err?.code !== "ERR_UNKNOWN_FILE_EXTENSION") throw err;
}
const t = (name, fn) => test(name, { skip: !policy && "this Node version cannot execute .ts directly" }, fn);

const BLOCKED = { filesystem: "이유 문장" };
const file = (path, content) => ({ path, content });

t("finds the declaration in the entry file", () => {
    const u = policy.findBlockedDlcUsage([file("main.cuff", "print(1)\nuse DLC:filesystem\n")], BLOCKED);
    assert.deepEqual(u, { dlc: "filesystem", reason: "이유 문장", path: "main.cuff", line: 2 });
});

t("finds it in an imported module file, not just the entry", () => {
    const files = [file("main.cuff", 'use h from "lib/h.cuff"\n'), file("lib/h.cuff", "note: x\n  use DLC:filesystem\n")];
    assert.deepEqual(policy.findBlockedDlcUsage(files, BLOCKED)?.path, "lib/h.cuff");
});

t("tolerates spacing variants and CRLF line endings", () => {
    for (const line of ["use DLC:filesystem", "use   DLC:filesystem", "use DLC : filesystem", "\tuse DLC:filesystem  "]) {
        assert.equal(policy.findBlockedDlcUsage([file("a.cuff", `print(1)\r\n${line}\r\n`)], BLOCKED)?.line, 2, JSON.stringify(line));
    }
});

t("does not trigger on comments, strings, other libraries or look-alike names", () => {
    for (const src of [
        "note: use DLC:filesystem is blocked",
        'print("use DLC:filesystem")',
        "use DLC:math\nuse DLC:network\nuse DLC:map",
        "use DLC:filesystems",
        "use DLC:filesystemx",
        'use helper from "filesystem.cuff"',
        "",
    ]) {
        assert.equal(policy.findBlockedDlcUsage([file("a.cuff", src)], BLOCKED), null, JSON.stringify(src));
    }
});

t("is driven entirely by the policy: add a library and it is blocked, empty policy blocks nothing", () => {
    const more = { filesystem: "a", network: "b" };
    assert.equal(policy.findBlockedDlcUsage([file("a.cuff", "use DLC:network")], more)?.dlc, "network");
    assert.equal(policy.findBlockedDlcUsage([file("a.cuff", "use DLC:network")], BLOCKED), null);
    assert.equal(policy.findBlockedDlcUsage([file("a.cuff", "use DLC:filesystem")], {}), null);
    assert.equal(policy.findBlockedDlcUsage([], BLOCKED), null);
});

t("regex metacharacters in a policy key cannot widen the match", () => {
    assert.equal(policy.findBlockedDlcUsage([file("a.cuff", "use DLC:anything")], { ".*": "x" }), null);
});

t("error text reads like an engine error and names the file, line and reason", () => {
    const text = policy.formatBlockedError({ dlc: "filesystem", reason: "이유", path: "lib/h.cuff", line: 7 });
    assert.match(text, /^ERROR: \[E5005\] Module Error: DLC:filesystem /);
    assert.match(text, /lib\/h\.cuff:7행 — use DLC:filesystem/);
    assert.match(text, /hint: 이유$/);
});

test("the shipped policy file blocks filesystem and has a reason for every entry", () => {
    const shipped = JSON.parse(fs.readFileSync(new URL("../../src/engine/webPolicy.json", import.meta.url), "utf8"));
    assert.ok("filesystem" in shipped.blockedDlcs, "filesystem must stay blocked in the web IDE");
    for (const [name, reason] of Object.entries(shipped.blockedDlcs)) {
        assert.ok(typeof reason === "string" && reason.length > 10, `blocked DLC "${name}" needs a user-facing reason`);
    }
});
