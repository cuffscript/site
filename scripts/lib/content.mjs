// Builds the HTML the site's pages are made of from content/**/*.md.
//
//   content/guide/_lead.md      page title + lead paragraph
//   content/guide/NN-name.md    one TOC group per file (front matter: group, summary, home)
//   content/home/NN-name.md     one card per file    (front matter: type, id, title, toc, ...)
//
// Everything that can be derived is derived: the guide TOC from the headings,
// the home page's "docs" grid from the guide's groups, counts from the engine
// metadata, and the DLC / error-code reference tables from that same metadata.

import fs from "node:fs";
import path from "node:path";
import { renderMarkdown, parseFrontmatter, escapeText, renderInline, ContentError } from "./markdown.mjs";

const ERROR_RANGES = [
    [1000, "Lexical"],
    [2000, "Syntax"],
    [3000, "Regex (문법)"],
    [3100, "Regex (실행)"],
    [4000, "Runtime"],
    [5000, "Module"],
    [6000, "Resource"],
    [9000, "Internal"],
];

function errorCategory(codeNumber) {
    let label = "기타";
    for (const [start, name] of ERROR_RANGES) if (codeNumber >= start) label = name;
    return label;
}

function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
        if (fallback !== undefined && err && err.code === "ENOENT") return fallback;
        throw new Error(`cannot read ${file}: ${err.message}`, { cause: err });
    }
}

function listMarkdown(dir) {
    if (!fs.existsSync(dir)) throw new Error(`content directory not found: ${dir}`);
    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .sort((a, b) => a.localeCompare(b, "en"));
}

/** Counts example projects the same way src/examples/index.ts discovers them. */
export function countExamples(examplesDir) {
    if (!fs.existsSync(examplesDir)) return 0;
    return fs.readdirSync(examplesDir).filter((n) => /^\d+_/.test(n) && (n.endsWith(".cuff") || fs.statSync(path.join(examplesDir, n)).isDirectory())).length;
}

/** Everything the content may reference: engine metadata, web policy, site config. */
export function loadContext(root) {
    const meta = readJson(path.join(root, "src/generated/engine-meta.json"));
    const policy = readJson(path.join(root, "src/engine/webPolicy.json"), { blockedDlcs: {} });
    const site = readJson(path.join(root, "src/siteConfig.json"));
    return { root, meta, policy, site };
}

function dlcNames(meta) {
    return Object.keys(meta.dlc);
}

/** Repository URLs derived from src/siteConfig.json (one place to change if the repo moves). */
export function repoUrls(site) {
    const githubUrl = `https://github.com/${site.repo}`;
    const blobUrl = `${githubUrl}/blob/${site.branch}`;
    return { githubUrl, blobUrl, cloneUrl: `${githubUrl}.git`, changelogUrl: `${blobUrl}/docs/CHANGELOG.md`, repoName: site.repo.split("/").pop() };
}

export function buildVars(ctx, extra = {}) {
    const names = dlcNames(ctx.meta);
    const urls = repoUrls(ctx.site);
    return {
        "site.repo": ctx.site.repo,
        "site.repoName": urls.repoName,
        "site.githubUrl": urls.githubUrl,
        "site.blobUrl": urls.blobUrl,
        "site.cloneUrl": urls.cloneUrl,
        "site.changelogUrl": urls.changelogUrl,
        "engine.version": ctx.meta.engineVersion,
        "engine.dlcCount": names.length,
        "engine.dlcNames": names.join("/"),
        "engine.functionCount": names.reduce((n, d) => n + (ctx.meta.dlc[d]?.functions.length ?? 0), 0),
        "engine.errorCodeCount": ctx.meta.errorCodes.length,
        "examples.count": countExamples(path.join(ctx.root, "src/examples")),
        "site.newsCount": ctx.site.newsCount,
        ...extra,
    };
}

function code(s) {
    return `<code>${escapeText(s)}</code>`;
}

function dlcReferenceHtml(ctx) {
    const blocked = ctx.policy.blockedDlcs ?? {};
    const rows = dlcNames(ctx.meta)
        .map((name) => {
            const fns = ctx.meta.dlc[name]?.functions ?? [];
            const note = Object.prototype.hasOwnProperty.call(blocked, name) ? "<br /><em>이 브라우저 IDE에서는 차단</em>" : "";
            return `<tr><td>${code(`DLC:${name}`)}${note}</td><td>${fns.map(code).join(", ")}</td></tr>`;
        })
        .join("");
    const always = ctx.meta.coreBuiltins.map(code).join(", ");
    return (
        `<table class="ref-table"><thead><tr><th>라이브러리</th><th>함수</th></tr></thead><tbody>${rows}</tbody></table>\n` +
        `<p>항상 쓸 수 있는 함수(<code>use</code> 불필요): ${always}.</p>`
    );
}

function errorCodesHtml(ctx) {
    const rows = ctx.meta.errorCodes
        .map((e) => `<tr><td>${code(e.code)}</td><td>${errorCategory(Number(e.code.slice(1)))}</td><td>${code(e.name)}</td></tr>`)
        .join("");
    return (
        `<details><summary>에러 코드 전체 목록 (${ctx.meta.errorCodes.length}개)</summary>` +
        `<table class="ref-table"><thead><tr><th>코드</th><th>범주</th><th>이름</th></tr></thead><tbody>${rows}</tbody></table></details>`
    );
}

function makeInclude(ctx) {
    const table = {
        "engine:dlc-reference": () => dlcReferenceHtml(ctx),
        "engine:error-codes": () => errorCodesHtml(ctx),
    };
    return (name) => (table[name] ? table[name]() : undefined);
}

export function buildGuide(ctx) {
    const dir = path.join(ctx.root, "content/guide");
    const files = listMarkdown(dir);
    const vars = buildVars(ctx);
    const include = makeInclude(ctx);

    let lead = "";
    const groups = [];
    const seenIds = new Map();

    for (const file of files) {
        const full = path.join(dir, file);
        const { data, body, bodyLine } = parseFrontmatter(fs.readFileSync(full, "utf8"), full);
        if (file.startsWith("_")) {
            if (file === "_lead.md") {
                const r = renderMarkdown(body, { file: full, firstLine: bodyLine, vars, include });
                lead = `<h1>${renderInline(String(data.title ?? "가이드"))}</h1>\n${r.html.replace(/^<p>/, '<p class="guide-lead">')}`;
            }
            continue;
        }
        if (!data.group) throw new ContentError("guide file needs a 'group:' in its front matter", full, 1);
        const r = renderMarkdown(body, { file: full, firstLine: bodyLine, vars, include, sections: { className: "guide-section" } });
        const sections = r.headings
            .filter((h) => h.level === 2)
            .map((h) => {
                const id = h.id;
                if (seenIds.has(id)) throw new ContentError(`duplicate section id "${id}" (also in ${seenIds.get(id)})`, full, h.line);
                seenIds.set(id, file);
                return { id, label: h.toc ?? h.text, title: h.text };
            });
        if (sections.length === 0) throw new ContentError("guide file has no '## Title {#id}' sections", full, 1);
        groups.push({
            title: String(data.group),
            summary: data.summary === undefined ? "" : renderMarkdownInline(String(data.summary), { file: full, vars }),
            showOnHome: data.home !== false,
            sections,
            html: r.html,
            file,
        });
    }

    const toc = groups
        .map(
            (g) =>
                `<div class="guide-toc-group">\n<h2>${renderInline(g.title)}</h2>\n` +
                g.sections.map((s) => `<a href="#${s.id}">${escapeText(s.label)}</a>`).join("\n") +
                `\n</div>`,
        )
        .join("\n");

    return {
        groups,
        tocHtml: toc,
        articleHtml: `${lead}\n${groups.map((g) => g.html).join("\n")}`,
    };
}

/** Inline-only markdown (front matter values), with variables. */
function renderMarkdownInline(text, { file, vars }) {
    const r = renderMarkdown(text, { file, vars });
    return r.html.replace(/^<p>([\s\S]*)<\/p>$/, "$1");
}

function docsGridHtml(guide) {
    const items = guide.groups
        .filter((g) => g.showOnHome)
        .map(
            (g) =>
                `<a class="home-docs-item" href="/guide/#${g.sections[0]?.id}">\n<h3>${renderInline(g.title)}</h3>\n<p>${g.summary}</p>\n</a>`,
        );
    return { html: `<div class="home-docs-grid">\n${items.join("\n")}\n</div>`, count: items.length };
}

export function buildHome(ctx, guide) {
    const dir = path.join(ctx.root, "content/home");
    const docs = docsGridHtml(guide);
    const vars = buildVars(ctx, { "docs.count": docs.count });
    const include = makeInclude(ctx);
    const { changelogUrl } = repoUrls(ctx.site);

    const cards = [];
    const toc = [];
    const seen = new Set();

    for (const file of listMarkdown(dir)) {
        const full = path.join(dir, file);
        const { data, body, bodyLine } = parseFrontmatter(fs.readFileSync(full, "utf8"), full);
        const type = String(data.type ?? "card");
        const id = data.id ? String(data.id) : undefined;
        const title = String(data.title ?? "");
        const rendered = renderMarkdown(body, { file: full, firstLine: bodyLine, vars, include, wrapTables: "table-scroll" }).html;

        if (type !== "hero") {
            if (!id) throw new ContentError("home card needs an 'id:' in its front matter", full, 1);
            if (seen.has(id)) throw new ContentError(`duplicate card id "${id}"`, full, 1);
            seen.add(id);
            toc.push(`<a href="#${id}">${escapeText(String(data.toc ?? title))}</a>`);
        }

        if (type === "hero") {
            cards.push(
                `<section class="home-card home-card-hero">\n` +
                `<a class="home-logo-link" href="/">\n<img class="home-logo" src="/favicon.svg" alt="CuffScript 로고" />\n</a>\n` +
                `<h1>${renderInline(title)}</h1>\n` +
                (data.slogan ? `<p class="home-slogan">${renderInline(String(data.slogan))}</p>\n` : "") +
                `${rendered}\n</section>`,
            );
        } else if (type === "news") {
            cards.push(
                `<section class="home-card" id="${id}">\n<h2>${renderInline(title)}</h2>\n${rendered}\n` +
                `<ul class="home-news-list" id="news-list"></ul>\n` +
                `<p class="home-news-state" id="news-state">불러오는 중…</p>\n` +
                `<p class="home-news-more">\n<a href="${changelogUrl}" target="_blank" rel="noreferrer">전체 변경 이력 보기 →</a>\n</p>\n</section>`,
            );
        } else if (type === "docs") {
            cards.push(`<section class="home-card" id="${id}">\n<h2>${renderInline(title)}</h2>\n${rendered}\n${docs.html}\n</section>`);
        } else if (type === "card") {
            cards.push(`<section class="home-card" id="${id}">\n<h2>${renderInline(title)}</h2>\n${rendered}\n</section>`);
        } else {
            throw new ContentError(`unknown card type "${type}" (hero | news | docs | card)`, full, 1);
        }
    }
    return { tocHtml: `<div class="home-toc-group">\n<h2>이 페이지</h2>\n${toc.join("\n")}\n</div>`, cardsHtml: cards.join("\n") };
}

const PLACEHOLDERS = {
    "<!--@guide:toc-->": (b) => b.guide.tocHtml,
    "<!--@guide:article-->": (b) => b.guide.articleHtml,
    "<!--@home:toc-->": (b) => b.home.tocHtml,
    "<!--@home:cards-->": (b) => b.home.cardsHtml,
};

/** Replaces the @-placeholders in a page shell. Builds lazily: only what is used. */
export function applyContent(html, ctx) {
    if (!Object.keys(PLACEHOLDERS).some((p) => html.includes(p))) return html;
    const built = {};
    const lazy = {
        get guide() {
            return (built.guide ??= buildGuide(ctx));
        },
        get home() {
            return (built.home ??= buildHome(ctx, lazy.guide));
        },
    };
    let out = html;
    for (const [placeholder, fn] of Object.entries(PLACEHOLDERS)) {
        if (out.includes(placeholder)) out = out.split(placeholder).join(fn(lazy));
    }
    return out;
}
