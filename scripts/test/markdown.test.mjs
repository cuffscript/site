import { test } from "node:test";
import assert from "node:assert/strict";
import {
    renderMarkdown,
    renderInline,
    parseFrontmatter,
    parseFenceInfo,
    extractCodeBlocks,
    ContentError,
} from "../lib/markdown.mjs";

const md = (src, opts) => renderMarkdown(src, opts).html;

test("front matter: key/value, booleans, quotes, body offset", () => {
    const { data, body, bodyLine } = parseFrontmatter('---\ngroup: 함수\nhome: false\nsummary: "a: b"\n---\n본문\n', "x.md");
    assert.deepEqual(data, { group: "함수", home: false, summary: "a: b" });
    assert.equal(body, "본문\n");
    assert.equal(bodyLine, 6);
    assert.deepEqual(parseFrontmatter("그냥 본문").data, {});
    assert.throws(() => parseFrontmatter("---\nkey: v\n", "x.md"), ContentError);
});

test("inline: code is escaped and wins over other markup", () => {
    assert.equal(renderInline("`a<b && c>d`"), "<code>a&lt;b &amp;&amp; c&gt;d</code>");
    assert.equal(renderInline("`**not bold**`"), "<code>**not bold**</code>");
    assert.equal(renderInline("`` a`b ``"), "<code>a`b</code>");
});

test("inline: underscores in identifiers are NOT emphasis", () => {
    assert.equal(renderInline("or_else 와 math_sqrt, str_trim_start"), "or_else 와 math_sqrt, str_trim_start");
});

test("inline: literal asterisks and math are left alone", () => {
    assert.equal(renderInline("2 * 3 * 4"), "2 * 3 * 4");
    assert.equal(renderInline("a*b"), "a*b");
});

test("inline: bold / em / nesting with code", () => {
    assert.equal(renderInline("**굵게** *기울임*"), "<strong>굵게</strong> <em>기울임</em>");
    assert.equal(renderInline("**`x` 와 y**"), "<strong><code>x</code> 와 y</strong>");
    assert.equal(renderInline("*얕은* 불변성"), "<em>얕은</em> 불변성");
});

test("inline: links - external ones open in a new tab, internal ones do not", () => {
    assert.equal(renderInline("[GitHub](https://github.com/a/b)"), '<a href="https://github.com/a/b" target="_blank" rel="noreferrer">GitHub</a>');
    assert.equal(renderInline("[가이드](/guide/#dlc)"), '<a href="/guide/#dlc">가이드</a>');
    assert.equal(renderInline("[`code` link](#x)"), '<a href="#x"><code>code</code> link</a>');
});

test("inline: escapes, entities, stray angle brackets, whitelisted tags", () => {
    assert.equal(renderInline("\\*not em\\* \\`tick\\`"), "*not em* `tick`");
    assert.equal(renderInline("a &amp; b & c"), "a &amp; b &amp; c");
    assert.equal(renderInline("<year> 와 <kbd>Ctrl</kbd>"), "&lt;year&gt; 와 <kbd>Ctrl</kbd>");
    assert.equal(renderInline("1 < 2 > 0"), "1 &lt; 2 &gt; 0");
});

test("headings: id and extra attributes", () => {
    const r = renderMarkdown("### `DLC:math` {#m}\n\n#### 평범한 제목", {});
    assert.equal(r.html, '<h3 id="m"><code>DLC:math</code></h3>\n<h4>평범한 제목</h4>');
});

test("sections: wraps ## headings, collects headings, requires ids", () => {
    const r = renderMarkdown("## 하나 {#one}\n\n본문 1\n\n## 둘 {#two toc=\"짧게\"}\n\n본문 2", { sections: { className: "guide-section" } });
    assert.equal(
        r.html,
        '<section class="guide-section" id="one">\n<h2>하나</h2>\n<p>본문 1</p>\n</section>\n' +
            '<section class="guide-section" id="two">\n<h2>둘</h2>\n<p>본문 2</p>\n</section>',
    );
    assert.deepEqual(
        r.headings.map((h) => [h.id, h.text, h.toc]),
        [["one", "하나", undefined], ["two", "둘", "짧게"]],
    );
    assert.throws(() => renderMarkdown("## 아이디 없음", { sections: { className: "s" } }), /needs an id/);
});

test("code fences: escaped, language class, tooling flags are not rendered", () => {
    const r = renderMarkdown('```cuff fragment error=E4006\nif a < b do:\n    print("&")\nend\n```');
    assert.equal(r.html, '<pre><code class="language-cuff">if a &lt; b do:\n    print("&amp;")\nend</code></pre>');
    assert.deepEqual(r.codeBlocks[0].flags, new Set(["fragment"]));
    assert.deepEqual(r.codeBlocks[0].attrs, { error: "E4006" });
    assert.equal(r.codeBlocks[0].line, 2);
});

test("code fences: no language -> bare <code>; longer fences may contain ```", () => {
    assert.equal(md("```\nnpm install x\n```"), "<pre><code>npm install x</code></pre>");
    assert.equal(md("````\n```\ninner\n```\n````"), "<pre><code>```\ninner\n```</code></pre>");
    assert.throws(() => md("```cuff\nnever closed"), /never closed/);
});

test("regression: <year:[num]4> inside a snippet never becomes an HTML tag", () => {
    const html = md('```cuff\nset match res to match "2026-12-25" from "<year:[num]4>-<month:[num]2>"\n```');
    assert.ok(html.includes("&lt;year:[num]4&gt;-&lt;month:[num]2&gt;"));
    assert.ok(!/<year/.test(html));
});

test("parseFenceInfo", () => {
    const i = parseFenceInfo('cuff skip stdin="a b" error=E1');
    assert.equal(i.lang, "cuff");
    assert.ok(i.flags.has("skip"));
    assert.equal(i.attrs.error, "E1");
    assert.equal(parseFenceInfo("vars").lang, "");
    assert.ok(parseFenceInfo("vars").flags.has("vars"));
});

test("tables: header/body, pipes in code spans and escaped pipes, optional wrapper", () => {
    const src = "| 이름 | 설명 |\n|---|---|\n| `a|b` | 파이프 \\| 포함 |\n| `x` | 둘째 |";
    assert.equal(
        md(src),
        '<table class="ref-table"><thead><tr><th>이름</th><th>설명</th></tr></thead><tbody>' +
            "<tr><td><code>a|b</code></td><td>파이프 | 포함</td></tr><tr><td><code>x</code></td><td>둘째</td></tr></tbody></table>",
    );
    assert.ok(md(src, { wrapTables: "table-scroll" }).startsWith('<div class="table-scroll"><table'));
    assert.throws(() => md("| a |\n|---|\n| 1 | 2 |"), /more cells/);
    // GitHub-style: an escaped pipe inside a code span is one literal pipe (also renders right on GitHub)
    assert.ok(md("| a |\n|---|\n| `x\\|y` |").includes("<td><code>x|y</code></td>"));
});

test("lists: tight bullets, wrapped items, ordered, nested", () => {
    assert.equal(md("- **하나** — 설명\n- 둘\n  이어지는 줄\n- 셋"), "<ul>\n<li><strong>하나</strong> — 설명</li>\n<li>둘\n이어지는 줄</li>\n<li>셋</li>\n</ul>");
    assert.equal(md("1. 가\n2. 나"), "<ol>\n<li>가</li>\n<li>나</li>\n</ol>");
    assert.equal(md("- 상위\n  - 하위 1\n  - 하위 2\n- 다음"), "<ul>\n<li><p>상위</p>\n<ul>\n<li>하위 1</li>\n<li>하위 2</li>\n</ul></li>\n<li>다음</li>\n</ul>");
});

test("paragraphs: a list may directly follow text; headings interrupt", () => {
    assert.equal(md("소개\n- a\n- b"), "<p>소개</p>\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>");
});

test("callouts: single paragraph is unwrapped, title is rendered, warn variant", () => {
    assert.equal(md("::: callout 제목\n본문 `x`\n:::"), '<div class="callout"><span class="callout-title">제목</span>\n본문 <code>x</code>\n</div>');
    assert.ok(md("::: warn T\n내용\n:::").startsWith('<div class="callout warn">'));
    const multi = md("::: callout T\n첫째\n\n둘째\n:::");
    assert.ok(multi.includes("<p>첫째</p>") && multi.includes("<p>둘째</p>"));
});

test("callouts may contain code fences (and ::: inside a fence is ignored)", () => {
    const html = md("::: warn T\n설명\n\n```text\n:::\n```\n:::");
    assert.ok(html.includes('<pre><code class="language-text">:::</code></pre>'));
    assert.ok(html.endsWith("</div>"));
});

test("directives: p / div / unknown / unclosed", () => {
    assert.equal(md("::: p home-note\n한 줄\n이어서\n:::"), '<p class="home-note">한 줄\n이어서</p>');
    assert.equal(md("::: div box\n문단\n:::"), '<div class="box"><p>문단</p></div>');
    assert.throws(() => md("::: nope\nx\n:::"), /unknown directive/);
    assert.throws(() => md("::: warn T\nx"), /never closed/);
});

test("variables: substituted outside code only; unknown ones fail loudly", () => {
    const vars = { "engine.dlcCount": 10 };
    assert.equal(md("DLC는 {{engine.dlcCount}}종, 코드 `{{engine.dlcCount}}`", { vars }), "<p>DLC는 10종, 코드 <code>{{engine.dlcCount}}</code></p>");
    assert.equal(md("```\n{{engine.dlcCount}}\n```", { vars }), "<pre><code>{{engine.dlcCount}}</code></pre>");
    assert.throws(() => md("{{engine.nope}}", { vars, file: "a.md" }), /a\.md:1: unknown variable/);
});

test("variables: a fence with the `vars` flag opts in to substitution; other fences never do", () => {
    const vars = { "site.cloneUrl": "https://example.org/r.git" };
    assert.equal(md("```vars\ngit clone {{site.cloneUrl}}\n```", { vars }), "<pre><code>git clone https://example.org/r.git</code></pre>");
    assert.equal(md("```sh vars\ngit clone {{site.cloneUrl}}\n```", { vars }), '<pre><code class="language-sh">git clone https://example.org/r.git</code></pre>');
    assert.equal(md("```cuff\nprint(\"{{site.cloneUrl}}\")\n```", { vars }), '<pre><code class="language-cuff">print("{{site.cloneUrl}}")</code></pre>');
});

test("includes: block form {{ns:name}} calls the host", () => {
    const html = md("앞\n\n{{engine:thing}}\n\n뒤", { include: (n) => (n === "engine:thing" ? "<hr data-x />" : undefined) });
    assert.equal(html, "<p>앞</p>\n<hr data-x />\n<p>뒤</p>");
    assert.throws(() => md("{{engine:missing}}", { include: () => undefined }), /unknown include/);
});

test("raw HTML blocks pass through untouched", () => {
    const raw = '<div class="home-cta">\n<a class="btn" href="/ide/">IDE</a>\n</div>';
    assert.equal(md(raw), raw);
});

test("blockquote and horizontal rule", () => {
    assert.equal(md("> 인용\n> 둘째 줄"), "<blockquote><p>인용\n둘째 줄</p></blockquote>");
    assert.equal(md("위\n\n---\n\n아래"), "<p>위</p>\n<hr />\n<p>아래</p>");
});

test("output blocks: distinct styling hook, and fence/end lines let a checker pair them with the snippet above", () => {
    const src = "```cuff\nprint(1)\n```\n\n```output\n1\n```\n";
    const r = renderMarkdown(src);
    assert.ok(r.html.includes('<pre class="code-output"><code class="language-output">1</code></pre>'));
    const [a, b] = r.codeBlocks;
    assert.equal(a.lang, "cuff");
    assert.equal(b.lang, "output");
    assert.equal(a.endLine, 3);
    assert.equal(b.fenceLine, 5); // one blank line between them
});

test("extractCodeBlocks reports 1-based line numbers within the file (front matter aware)", () => {
    const src = "---\ngroup: x\n---\n\n## T {#t}\n\n```cuff\nprint(1)\n```\n\n::: warn W\n```cuff skip\nx\n```\n:::\n";
    const blocks = extractCodeBlocks(src, "f.md");
    assert.deepEqual(blocks.map((b) => [b.lang, b.line, b.code]), [["cuff", 8, "print(1)"], ["cuff", 13, "x"]]);
    assert.ok(blocks[1].flags.has("skip"));
});
