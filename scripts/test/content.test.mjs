// Invariants of the generated pages, checked against the REAL content/ folder.
// These are the promises the rest of the site (guide.ts scrollspy, home.ts hooks,
// the generated reference tables) depends on - a typo in a .md file fails here,
// with a message, instead of silently shipping a broken page.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyContent, buildGuide, buildHome, loadContext } from "../lib/content.mjs";
import { ContentError } from "../lib/markdown.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ctx = loadContext(root);
const guide = buildGuide(ctx);
const home = buildHome(ctx, guide);
const ids = (html, tag) => [...html.matchAll(new RegExp(`<${tag}[^>]*\\sid="([^"]+)"`, "g"))].map((m) => m[1]);
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("guide: section ids are unique and every TOC link points at a real section", () => {
    const sectionIds = ids(guide.articleHtml, "section");
    assert.equal(new Set(sectionIds).size, sectionIds.length, "duplicate section ids");
    const tocTargets = [...guide.tocHtml.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual([...tocTargets].sort(), [...sectionIds].sort(), "TOC and sections must match one-to-one");
});

test("guide: every group file contributes a TOC group and at least one section", () => {
    const files = fs.readdirSync(path.join(root, "content/guide")).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    assert.equal(guide.groups.length, files.length);
    for (const g of guide.groups) assert.ok(g.sections.length > 0, g.file);
    assert.equal((guide.tocHtml.match(/guide-toc-group/g) ?? []).length, files.length);
});

test("guide: the page has a title and a lead paragraph", () => {
    assert.match(guide.articleHtml, /^<h1>[^<]+<\/h1>\n<p class="guide-lead">/);
});

test("code is always escaped: no raw '<' ever appears inside a <pre><code> block", () => {
    for (const html of [guide.articleHtml, home.cardsHtml]) {
        for (const m of html.matchAll(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)) {
            assert.ok(!m[1].includes("<"), `unescaped '<' in code block: ${m[1].slice(0, 80)}`);
        }
    }
});

test("regression: the named-capture example renders as text, not as <year:...> elements", () => {
    assert.ok(guide.articleHtml.includes("&lt;year:[num]4&gt;-&lt;month:[num]2&gt;-&lt;day:[num]2&gt;"));
    assert.ok(!/<year|<month|<day/.test(guide.articleHtml));
});

test("no template syntax leaks into the output ({{...}} or @-placeholders)", () => {
    for (const html of [guide.articleHtml, guide.tocHtml, home.cardsHtml, home.tocHtml]) {
        assert.ok(!/\{\{[\w.:-]+\}\}/.test(html), "unreplaced {{...}}");
        assert.ok(!html.includes("<!--@"), "unreplaced placeholder");
    }
});

test("generated DLC reference lists every library and every function once per library that has it", () => {
    const ref = guide.articleHtml.slice(guide.articleHtml.indexOf("<h3>전체 함수 목록</h3>"));
    const table = ref.slice(0, ref.indexOf("</table>"));
    // length / contains / index_of are registered by several libraries on purpose,
    // so a function must appear once for EACH library that lists it.
    const libsWith = (fn) => Object.values(ctx.meta.dlc).filter((d) => d.functions.includes(fn)).length;
    for (const [dlc, info] of Object.entries(ctx.meta.dlc)) {
        assert.ok(table.includes(`<code>DLC:${dlc}</code>`), `missing library ${dlc}`);
        for (const fn of info.functions) {
            assert.equal(table.split(`<code>${fn}</code>`).length - 1, libsWith(fn), `${fn} listed the wrong number of times`);
        }
    }
});

test("generated error-code table lists every engine error code", () => {
    const details = guide.articleHtml.match(/<details>[\s\S]*?<\/details>/)?.[0] ?? "";
    for (const e of ctx.meta.errorCodes) assert.ok(details.includes(`<code>${e.code}</code>`), e.code);
});

test("blocked libraries are flagged in the generated reference (so the guide never promises them)", () => {
    for (const name of Object.keys(ctx.policy.blockedDlcs)) {
        assert.match(guide.articleHtml, new RegExp(`<code>DLC:${name}</code><br /><em>이 브라우저 IDE에서는 차단</em>`));
    }
});

test("home: exactly one hero, unique card ids, sidebar links match the cards", () => {
    assert.equal((home.cardsHtml.match(/home-card-hero/g) ?? []).length, 1);
    const cardIds = ids(home.cardsHtml, "section");
    assert.equal(new Set(cardIds).size, cardIds.length);
    const tocTargets = [...home.tocHtml.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(tocTargets, cardIds);
});

test("home: the hooks home.ts / newsFeed.ts look up by id exist", () => {
    for (const id of ["news-list", "news-state", "icon-play"]) {
        assert.ok(home.cardsHtml.includes(`id="${id}"`), `missing #${id} (the page script needs it)`);
    }
});

test("home: the docs grid is derived from the guide and every link lands on a real section", () => {
    const items = [...home.cardsHtml.matchAll(/class="home-docs-item" href="\/guide\/#([^"]+)"/g)].map((m) => m[1]);
    assert.equal(items.length, guide.groups.filter((g) => g.showOnHome).length);
    const sectionIds = new Set(ids(guide.articleHtml, "section"));
    for (const id of items) assert.ok(sectionIds.has(id), `docs grid points at missing guide section #${id}`);
});

test("home: counts shown in the text come from the real data, not from memory", () => {
    const tour = home.cardsHtml;
    assert.ok(tour.includes(`${Object.keys(ctx.meta.dlc).length}종`), "DLC count");
    assert.ok(tour.includes(Object.keys(ctx.meta.dlc).join("/")), "DLC list");
    const exampleCount = fs.readdirSync(path.join(root, "src/examples")).filter((n) => /^\d+_/.test(n)).length;
    assert.ok(tour.includes(`예제 ${exampleCount}개`), "example count");
});

test("page shells still contain every placeholder, and applying content removes them all", () => {
    for (const [file, marks] of [["index.html", ["<!--@home:toc-->", "<!--@home:cards-->"]], ["guide/index.html", ["<!--@guide:toc-->", "<!--@guide:article-->"]]]) {
        const shell = read(file);
        for (const m of marks) assert.ok(shell.includes(m), `${file} lost ${m}`);
        const out = applyContent(shell, ctx);
        assert.ok(!out.includes("<!--@"), `${file}: placeholder left behind`);
        assert.ok(out.includes('<script type="module"'), `${file}: lost its script tag`);
    }
});

test("pages without placeholders pass through untouched (e.g. the IDE page)", () => {
    const ide = read("ide/index.html");
    assert.equal(applyContent(ide, ctx), ide);
});

test("authoring mistakes fail the build with file:line, not silently", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-bad-"));
    fs.cpSync(path.join(root, "src"), path.join(dir, "src"), { recursive: true });
    fs.cpSync(path.join(root, "content"), path.join(dir, "content"), { recursive: true });
    const bad = (rel, fn) => {
        const f = path.join(dir, rel);
        const before = fs.readFileSync(f, "utf8");
        fs.writeFileSync(f, fn(before));
        try {
            return assert.throws(() => buildHome(loadContext(dir), buildGuide(loadContext(dir))), ContentError);
        } finally {
            fs.writeFileSync(f, before);
        }
    };
    bad("content/home/20-why.md", (s) => `${s}\n{{engine.noSuchThing}}\n`);
    bad("content/guide/04-functions.md", (s) => s.replace("{#functions}", "{#async}")); // duplicate id
    bad("content/guide/02-syntax.md", (s) => `${s}\n\`\`\`cuff\nnever closed\n`);
    bad("content/home/30-tour.md", (s) => s.replace("id: tour", "type: weird\nid: tour"));
});
