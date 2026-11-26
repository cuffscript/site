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
import { errorTagNumber } from "./errorTag.mjs";
import { ERROR_CATEGORIES } from "./engine-docs.mjs";

const ERROR_RANGES = [
    [1000, "Lexical"],
    [2000, "Syntax"],
    [3000, "Regex (syntax)"],
    [3100, "Regex (runtime)"],
    [4000, "Runtime"],
    [5000, "Module"],
    [6000, "Resource"],
    [9000, "Internal"],
];

function errorCategory(codeNumber) {
    let label = "Other";
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
    // What the engine's docs say about errors and limits (see scripts/lib/engine-docs.mjs).
    const docs = readJson(path.join(root, "src/generated/engine-docs.json"), { errors: [], limits: [] });
    return { root, meta, policy, site, docs };
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
        "engine.dlcNames": names.join(", "),
        // every reserved word, as inline code (the literals true/false are reserved too)
        "engine.keywords": [...ctx.meta.keywords, ...ctx.meta.literals.filter((w) => w !== "empty")].map((w) => `\`${w}\``).join(", "),
        "engine.keywordCount": ctx.meta.keywords.length + ctx.meta.literals.filter((w) => w !== "empty").length,
        "engine.functionCount": names.reduce((n, d) => n + (ctx.meta.dlc[d]?.functions.length ?? 0), 0),
        "engine.errorCodeCount": ctx.meta.errorCodes.length,
        "examples.count": countExamples(path.join(ctx.root, "src/examples")),
        "site.newsCount": ctx.site.newsCount,
        // {{error.DivisionByZero}} -> the tag the engine prints for it, e.g. E4-006
        ...Object.fromEntries(ctx.meta.errorCodes.map((e) => [`error.${e.name}`, e.code])),
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
            const note = Object.prototype.hasOwnProperty.call(blocked, name) ? "<br /><em>Blocked in this browser IDE</em>" : "";
            return `<tr><td>${code(`DLC:${name}`)}${note}</td><td>${fns.map(code).join(", ")}</td></tr>`;
        })
        .join("");
    const always = ctx.meta.coreBuiltins.map(code).join(", ");
    return (
        `<table class="ref-table"><thead><tr><th>Library</th><th>Functions</th></tr></thead><tbody>${rows}</tbody></table>\n` +
        `<p>Always available (no <code>use</code> needed): ${always}.</p>`
    );
}

function errorCodesHtml(ctx) {
    const rows = ctx.meta.errorCodes
        .map((e) => `<tr><td>${code(e.code)}</td><td>${errorCategory(errorTagNumber(e.code))}</td><td>${code(e.name)}</td></tr>`)
        .join("");
    return (
        `<details><summary>Full list of error codes (${ctx.meta.errorCodes.length})</summary>` +
        `<table class="ref-table"><thead><tr><th>Code</th><th>Category</th><th>Name</th></tr></thead><tbody>${rows}</tbody></table></details>`
    );
}

/**
 * Links in the engine's own docs are relative to docs/reference/. A link to an error code stays on
 * this site (the error page); anything else points at the file in the repository.
 */
function engineDocLinks(md, ctx) {
    const blob = repoUrls(ctx.site).blobUrl;
    return md.replace(/\]\(([^)\s#]+)(#[^)\s]*)?\)/g, (all, target, hash = "") => {
        if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return all;
        const resolved = path.posix.normalize(path.posix.join("docs/reference", target));
        if (resolved === "docs/reference/errors.md" && /^#e\d+-\d{3}$/i.test(hash)) return `](/errors/${hash.toUpperCase()})`;
        return `](${blob}/${resolved}${hash})`;
    });
}

function limitsTableHtml(ctx) {
    const rows = ctx.docs.limits
        .map((l) => {
            const raises = l.raises ? `<a href="/errors/#${l.raises}">${code(l.raises)}</a>` : "";
            return `<tr><td>${renderInline(l.name)}</td><td class="num">${renderInline(l.value)}</td><td>${raises}</td><td>${renderInline(engineDocLinks(l.description, ctx))}</td></tr>`;
        })
        .join("");
    return `<div class="table-scroll"><table class="ref-table"><thead><tr><th>Limit</th><th>Value</th><th>Raises</th><th>What it is</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function errorEntryHtml(e, ctx, vars) {
    const opts = { file: "src/generated/engine-docs.json", firstLine: 1, vars, wrapTables: "table-scroll" };
    const state = e.reserved
        ? '<span class="err-tag err-tag-muted">never raised</span>'
        : e.catchable
          ? '<span class="err-tag err-tag-ok">or_else can catch it</span>'
          : '<span class="err-tag err-tag-stop">ends the program</span>';
    const parts = [
        `<section class="err-entry${e.reserved ? " err-reserved" : ""}" id="${e.code}" data-category="${escapeText(e.category)}">`,
        `<header class="err-head"><h3><a class="err-code" href="#${e.code}">${e.code}</a><span class="err-name">${escapeText(e.name)}</span></h3>` +
            `<span class="err-tags"><span class="err-tag">${escapeText(e.category)}</span>${state}</span></header>`,
        `<p class="err-meaning">${renderInline(engineDocLinks(e.meaning, ctx))}</p>`,
    ];
    if (e.detail) {
        parts.push(`<div class="err-how"><h4>Cause and fix</h4>${renderMarkdown(engineDocLinks(e.detail, ctx), opts).html}</div>`);
    }
    if (e.example) {
        const fence = "```";
        const md = `${fence}cuff fragment\n${e.example}\n${fence}\n\n${fence}text\n${e.report}\n${fence}`;
        parts.push(`<details class="err-example"><summary>A program that raises it, and what the engine prints</summary>${renderMarkdown(md, opts).html}</details>`);
    }
    parts.push("</section>");
    return parts.join("\n");
}

export function buildErrorsPage(ctx) {
    const vars = buildVars(ctx);
    const errors = ctx.docs.errors;
    if (errors.length === 0) throw new Error("src/generated/engine-docs.json has no errors: run node scripts/sync-engine.mjs <engine-dir>");
    const categories = Object.values(ERROR_CATEGORIES).filter((c) => errors.some((e) => e.category === c));
    const raised = errors.filter((e) => !e.reserved);
    const reserved = errors.filter((e) => e.reserved);

    const chips =
        `<button type="button" class="err-chip" data-category="" aria-pressed="true">All <span>${raised.length}</span></button>` +
        categories
            .map((c) => {
                const n = raised.filter((e) => e.category === c).length;
                return n ? `<button type="button" class="err-chip" data-category="${escapeText(c)}" aria-pressed="false">${escapeText(c)} <span>${n}</span></button>` : "";
            })
            .join("");

    const groups = categories
        .map((c) => {
            const list = raised.filter((e) => e.category === c);
            if (list.length === 0) return "";
            const id = `cat-${c.toLowerCase().replace(/\s+/g, "-")}`;
            return `<section class="err-group guide-section" id="${id}" data-category="${escapeText(c)}"><h2>${escapeText(c)} errors <span class="err-count">${list.length}</span></h2>\n${list.map((e) => errorEntryHtml(e, ctx, vars)).join("\n")}\n</section>`;
        })
        .join("\n");

    const reservedHtml = reserved.length
        ? `<details class="err-reserved-group guide-section" id="never-raised"><summary>Codes the engine never raises (${reserved.length})</summary>` +
          `<p>These numbers are reserved. Most syntax problems, for example, are reported as <a href="#E2-001">E2-001</a>, whose message says what is wrong.</p>\n` +
          `${reserved.map((e) => errorEntryHtml(e, ctx, vars)).join("\n")}</details>`
        : "";

    return { total: errors.length, raised: raised.length, chipsHtml: chips, listHtml: `${groups}\n${reservedHtml}` };
}

function makeInclude(ctx) {
    const table = {
        "engine:dlc-reference": () => dlcReferenceHtml(ctx),
        "engine:error-codes": () => errorCodesHtml(ctx),
        "engine:limits": () => limitsTableHtml(ctx),
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
                lead = `<h1>${renderInline(String(data.title ?? "Guide"))}</h1>\n${r.html.replace(/^<p>/, '<p class="guide-lead">')}`;
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

/** Splits a card body into the text before the first `### ` heading and one part per `### ` heading. */
function splitByHeading(body) {
    const parts = body.split(/^### /m);
    const intro = parts.shift() ?? "";
    return { intro, items: parts.map((p) => ({ title: p.slice(0, p.indexOf("\n")).trim(), text: p.slice(p.indexOf("\n") + 1) })) };
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
                `<a class="home-logo-link" href="/">\n<img class="home-logo" src="/favicon.svg" alt="CuffScript logo" />\n</a>\n` +
                `<h1>${renderInline(title)}</h1>\n` +
                (data.slogan ? `<p class="home-slogan">${renderInline(String(data.slogan))}</p>\n` : "") +
                `${rendered}\n</section>`,
            );
        } else if (type === "news") {
            cards.push(
                `<section class="home-card" id="${id}">\n<h2>${renderInline(title)}</h2>\n${rendered}\n` +
                `<ul class="home-news-list" id="news-list"></ul>\n` +
                `<p class="home-news-state" id="news-state">Loading…</p>\n` +
                `<p class="home-news-more">\n<a href="${changelogUrl}" target="_blank" rel="noreferrer">View the full change history →</a>\n</p>\n</section>`,
            );
        } else if (type === "docs") {
            cards.push(`<section class="home-card" id="${id}">\n<h2>${renderInline(title)}</h2>\n${rendered}\n${docs.html}\n</section>`);
        } else if (type === "features") {
            const opts = { file: full, firstLine: bodyLine, vars, include, wrapTables: "table-scroll" };
            const { intro, items } = splitByHeading(body);
            if (items.length === 0) throw new ContentError("a features card needs '### Title' sections", full, bodyLine);
            const tiles = items.map((it) => `<article class="home-feature">\n<h3>${renderInline(it.title)}</h3>\n${renderMarkdown(it.text, opts).html}\n</article>`);
            cards.push(
                `<section class="home-card" id="${id}">\n<h2>${renderInline(title)}</h2>\n${renderMarkdown(intro, opts).html}\n` +
                `<div class="home-features">\n${tiles.join("\n")}\n</div>\n</section>`,
            );
        } else if (type === "faq") {
            const opts = { file: full, firstLine: bodyLine, vars, include, wrapTables: "table-scroll" };
            const { intro, items } = splitByHeading(body);
            if (items.length === 0) throw new ContentError("a faq card needs '### Question' sections", full, bodyLine);
            const entries = items.map((it) => `<details class="faq-item">\n<summary>${renderInline(it.title)}</summary>\n<div class="faq-answer">\n${renderMarkdown(it.text, opts).html}\n</div>\n</details>`);
            cards.push(
                `<section class="home-card" id="${id}">\n<h2>${renderInline(title)}</h2>\n${renderMarkdown(intro, opts).html}\n` +
                `<div class="faq">\n${entries.join("\n")}\n</div>\n</section>`,
            );
        } else if (type === "card") {
            cards.push(`<section class="home-card" id="${id}">\n<h2>${renderInline(title)}</h2>\n${rendered}\n</section>`);
        } else {
            throw new ContentError(`unknown card type "${type}" (hero | news | docs | card | features | faq)`, full, 1);
        }
    }
    return { tocHtml: `<div class="home-toc-group">\n<h2>On this page</h2>\n${toc.join("\n")}\n</div>`, cardsHtml: cards.join("\n") };
}

const PLACEHOLDERS = {
    "<!--@guide:toc-->": (b) => b.guide.tocHtml,
    "<!--@guide:article-->": (b) => b.guide.articleHtml,
    "<!--@home:toc-->": (b) => b.home.tocHtml,
    "<!--@home:cards-->": (b) => b.home.cardsHtml,
    "<!--@errors:filters-->": (b) => b.errors.chipsHtml,
    "<!--@errors:list-->": (b) => b.errors.listHtml,
    "<!--@errors:count-->": (b) => String(b.errors.raised),
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
        get errors() {
            return (built.errors ??= buildErrorsPage(ctx));
        },
    };
    let out = html;
    for (const [placeholder, fn] of Object.entries(PLACEHOLDERS)) {
        if (out.includes(placeholder)) out = out.split(placeholder).join(fn(lazy));
    }
    return out;
}
