// Tests src/changelog.ts (the real TypeScript, run by Node) - the parser behind the
// home page's live "최신 소식" card.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let mod;
try {
    mod = await import("../../src/changelog.ts");
} catch (err) {
    if (err?.code !== "ERR_UNKNOWN_FILE_EXTENSION") throw err;
}
const t = (name, fn) => test(name, { skip: !mod && "this Node version cannot execute .ts directly" }, fn);
const OPTS = { maxEntries: 3, summaryMaxLen: 200 };

const SAMPLE = `# Changelog

## v2.0.0 - 2026-09-25

## Description

- **Nesting depth ceiling raised to 512.** An internal limit.
- **New: \`constant list\`** — a frozen list
  that continues on a second line.
- Added error codes: \`E4027\`.

---

## v1.6.0 - 2026-09-21

- Fixed a crash on deep input.
- Plain first bullet only.

## v1.5.0 - 2026-09-19

Intro prose without any bullets.

## v1.4.0 - 2026-09-18

- Added \`DLC:json\`.
`;

t("newest first, up to maxEntries; sections without bullets are skipped", () => {
    const e = mod.parseChangelog(SAMPLE, OPTS);
    assert.deepEqual(e.map((x) => [x.version, x.date]), [["2.0.0", "2026-09-25"], ["1.6.0", "2026-09-21"], ["1.4.0", "2026-09-18"]]);
    assert.equal(mod.parseChangelog(SAMPLE, { ...OPTS, maxEntries: 1 }).length, 1);
});

t("prefers a New/Added/Keyword bullet over the first one (even when wrapped in **bold**)", () => {
    const [first, second] = mod.parseChangelog(SAMPLE, OPTS);
    assert.match(first.summaryHtml, /^<strong>New: <code>constant list<\/code><\/strong> — a frozen list that continues on a second line\.$/);
    assert.match(second.summaryHtml, /^Fixed a crash/); // no priority bullet -> first bullet
});

t("everything from the changelog is HTML-escaped; only code and bold are re-enabled", () => {
    const md = "## v1.0.0 - 2026-01-01\n\n- Added <script>alert(1)</script> & `a<b` and **x**.\n";
    const [e] = mod.parseChangelog(md, OPTS);
    assert.equal(e.summaryHtml, "Added &lt;script&gt;alert(1)&lt;/script&gt; &amp; <code>a&lt;b</code> and <strong>x</strong>.");
    assert.ok(!e.summaryHtml.includes("<script"));
});

t("long summaries are cut at a word boundary and end with an ellipsis", () => {
    const md = `## v1.0.0 - 2026-01-01\n\n- Added ${"word ".repeat(100)}\n`;
    const [e] = mod.parseChangelog(md, { maxEntries: 1, summaryMaxLen: 60 });
    assert.ok(e.summaryHtml.endsWith("…"));
    assert.ok(e.summaryHtml.length <= 61);
    assert.ok(!/wor…$/.test(e.summaryHtml), "must not cut inside a word");
});

t("garbage in, nothing out (no version headers => no entries, no exception)", () => {
    assert.deepEqual(mod.parseChangelog("just some text\n- a bullet\n", OPTS), []);
    assert.deepEqual(mod.parseChangelog("", OPTS), []);
});

// The real engine's changelog, if one is around (a sibling checkout or $CUFFSCRIPT_ENGINE).
const here = path.dirname(fileURLToPath(import.meta.url));
const real = [process.env.CUFFSCRIPT_ENGINE, path.join(here, "../../../cuffscript"), path.join(here, "../../../cuffscript-main")]
    .filter(Boolean)
    .map((d) => path.join(d, "docs/CHANGELOG.md"))
    .find((f) => fs.existsSync(f));

test("the engine's real CHANGELOG.md parses into readable entries", { skip: (!mod && "no .ts support") || (!real && "no engine checkout found") }, () => {
    const entries = mod.parseChangelog(fs.readFileSync(real, "utf8"), OPTS);
    assert.equal(entries.length, 3);
    for (const e of entries) {
        assert.match(e.version, /^\d+\.\d+\.\d+$/);
        assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(e.summaryHtml.length > 10, `${e.version} has an empty summary`);
    }
});
