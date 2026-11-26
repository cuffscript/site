// The error reference page (/errors/) and the limits table, built from src/generated/engine-docs.json,
// plus the extractor that produces that file (against a small FAKE engine tree and a fake cuffc).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyContent, buildErrorsPage, buildGuide, loadContext } from "../lib/content.mjs";
import { extractEngineDocs, parseLimits, describeDocsDiff } from "../lib/engine-docs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ctx = loadContext(root);
const page = buildErrorsPage(ctx);
const ids = (html) => [...html.matchAll(/<section class="err-entry[^"]*" id="([^"]+)"/g)].map((m) => m[1]);

test("errors page: every engine error code has exactly one entry", () => {
    const found = ids(page.listHtml);
    assert.deepEqual([...found].sort(), ctx.meta.errorCodes.map((e) => e.code).sort());
    assert.equal(new Set(found).size, found.length, "an entry appears twice");
});

test("errors page: codes nothing raises are kept apart, in their own group", () => {
    const reservedStart = page.listHtml.indexOf('id="never-raised"');
    assert.ok(reservedStart > 0, "the group of codes that are never raised is missing");
    const before = ids(page.listHtml.slice(0, reservedStart));
    const after = ids(page.listHtml.slice(reservedStart));
    for (const e of ctx.docs.errors) assert.equal(after.includes(e.code), e.reserved, `${e.code} is in the wrong group`);
    assert.equal(before.length, ctx.docs.errors.filter((e) => !e.reserved).length);
});

test("errors page: code is escaped and no link is left pointing at a relative .md file", () => {
    for (const [, body] of page.listHtml.matchAll(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)) {
        assert.ok(!/<[a-z!/]/i.test(body), `raw markup inside a code block: ${body.slice(0, 60)}`);
    }
    for (const [, href] of page.listHtml.matchAll(/href="([^"]*)"/g)) {
        assert.ok(/^(https?:\/\/|\/|#)/.test(href), `relative link left over: ${href}`);
    }
});

test("errors page: links between errors land on a real entry", () => {
    const known = new Set(ids(page.listHtml));
    for (const [, code] of page.listHtml.matchAll(/href="(?:\/errors\/)?#(E\d+-\d{3})"/g)) assert.ok(known.has(code), `link to ${code} lands nowhere`);
    for (const l of ctx.docs.limits) if (l.raises) assert.ok(known.has(l.raises), `limit "${l.name}" raises unknown ${l.raises}`);
});

test("errors page: an error the program can catch says so, and the others say that they end the program", () => {
    const entry = (code) => page.listHtml.split(`id="${code}"`)[1].split("</section>")[0];
    assert.ok(entry("E4-006").includes("or_else can catch it"));
    assert.ok(entry("E2-001").includes("ends the program"));
});

test("errors page: the shell has its placeholders and none is left after applying content", () => {
    const shell = fs.readFileSync(path.join(root, "errors/index.html"), "utf8");
    for (const m of ["<!--@errors:filters-->", "<!--@errors:list-->", "<!--@errors:count-->"]) assert.ok(shell.includes(m), `errors/index.html lost ${m}`);
    const out = applyContent(shell, ctx);
    assert.ok(!out.includes("<!--@"), "placeholder left behind");
    assert.ok(out.includes('<script type="module"'));
});

test("limits table: every limit of the engine is listed, and {{engine:limits}} is usable in the guide", () => {
    const guide = buildGuide(ctx);
    assert.ok(guide.articleHtml.includes("ref-table"));
    const table = fs.readdirSync(path.join(root, "content/guide")).map((f) => fs.readFileSync(path.join(root, "content/guide", f), "utf8")).join("\n");
    assert.ok(table.includes("{{engine:limits}}"), "no guide page shows the limits table");
    for (const l of ctx.docs.limits) assert.ok(guide.articleHtml.includes(l.value.replace(/&/g, "&amp;")), `limit "${l.name}" (${l.value}) is not in the guide`);
});

// ---- the extractor, against a fake engine ----

const ERRORS_MD = `# Error catalogue

## Codes

<!-- BEGIN GENERATED: error-table -->
### Runtime Errors

| Code | Meaning | \`or_else\` can catch it |
| :--- | :--- | :---: |
| <a id="e4-006"></a>\`E4-006\` | Division by zero. | yes |
| <a id="e4-099"></a>\`E4-099\` | An old number. _Reserved: never raised._ | no |
<!-- END GENERATED: error-table -->

## What each error looks like

**E4-006.** A number was divided by \`0\`. Check the divisor first, see [limits](limits.md#x).

\`\`\`cuff error E4-006
print(1 / 0)
\`\`\`

### Codes without an example

- **\`E4-099\`** is reserved.
`;

const LIMITS_MD = `# Limits

<!-- BEGIN GENERATED: limits-table -->
| Limit | Value | Raises | What it is |
| :--- | ---: | :--- | :--- |
| Call depth | 1,000 | [\`E4-017\`](errors.md#e4-017) | How many calls may be active. |
| Stack budget | 64 MiB |  | The native stack. |
<!-- END GENERATED: limits-table -->
`;

function fakeEngine(extra = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-docs-"));
    fs.mkdirSync(path.join(dir, "docs/reference"), { recursive: true });
    fs.writeFileSync(path.join(dir, "docs/reference/errors.md"), extra.errors ?? ERRORS_MD);
    fs.writeFileSync(path.join(dir, "docs/reference/limits.md"), LIMITS_MD);
    return dir;
}

function fakeCuffc(code) {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fake-cuffc-")), "cuffc");
    fs.writeFileSync(file, `#!/bin/sh\necho "ERROR: [${code}] Runtime Error at line 1, column 7" >&2\necho "  | division by zero" >&2\nexit 1\n`);
    fs.chmodSync(file, 0o755);
    return file;
}

const CODES = [
    { code: "E4-006", name: "DivisionByZero" },
    { code: "E4-099", name: "OldNumber" },
];

test("extractor: meaning, cause and fix, example and the real report end up on each entry", () => {
    const { errors, limits } = extractEngineDocs(fakeEngine(), CODES, fakeCuffc("E4-006"));
    const div = errors.find((e) => e.code === "E4-006");
    assert.equal(div.category, "Runtime");
    assert.equal(div.meaning, "Division by zero.");
    assert.equal(div.catchable, true);
    assert.ok(div.detail.startsWith("A number was divided by `0`."));
    assert.equal(div.example, "print(1 / 0)");
    assert.ok(div.report.startsWith("[E4-006] Runtime Error at line 1"), "the ERROR: prefix is dropped");
    const old = errors.find((e) => e.code === "E4-099");
    assert.equal(old.reserved, true);
    assert.equal(old.meaning, "An old number.");
    assert.equal(old.example, null);
    assert.deepEqual(limits, [
        { name: "Call depth", value: "1,000", raises: "E4-017", description: "How many calls may be active." },
        { name: "Stack budget", value: "64 MiB", raises: null, description: "The native stack." },
    ]);
});

test("extractor: an example that raises another code than the one it is listed under stops the sync", () => {
    assert.throws(() => extractEngineDocs(fakeEngine(), CODES, fakeCuffc("E4-007")), /E4-006.*raised E4-007/s);
});

test("extractor: a code the engine has but the docs do not list stops the sync", () => {
    assert.throws(() => extractEngineDocs(fakeEngine(), [...CODES, { code: "E4-100", name: "Brand" }], fakeCuffc("E4-006")), /E4-100/);
});

test("extractor: a missing marker is an error, not an empty page", () => {
    assert.throws(() => extractEngineDocs(fakeEngine({ errors: ERRORS_MD.replace("<!-- END GENERATED: error-table -->", "") }), CODES, fakeCuffc("E4-006")), /markers/);
    assert.throws(() => parseLimits("# nothing here"), /markers/);
});

test("extractor: a built cuffc is required", () => {
    assert.throws(() => extractEngineDocs(fakeEngine(), CODES, undefined), /cuffc/);
});

test("describeDocsDiff names what was added, removed and changed", () => {
    const a = { errors: [{ code: "E4-001" }, { code: "E4-002", x: 1 }], limits: [{ name: "A" }] };
    const b = { errors: [{ code: "E4-002", x: 2 }, { code: "E4-003" }], limits: [{ name: "A" }, { name: "B" }] };
    assert.deepEqual(describeDocsDiff(a, b).sort(), ["error added: E4-003", "error changed: E4-002", "error removed: E4-001", "limit added: B"].sort());
});
