// A small, dependency-free Markdown -> HTML converter for this site's content.
//
// It deliberately implements only what the guide / home page need, so there is
// nothing to install and behaviour is easy to reason about. Supported:
//   - front matter ("---" block of `key: value` lines)
//   - ATX headings with optional attributes:  ## Title {#id toc="Short label"}
//   - paragraphs, **bold**, *em*, `code`, [links](url), backslash escapes
//   - fenced code blocks (info string: language + free-form flags for tooling)
//   - pipe tables, "-" / "1." lists (one nested level and up), blockquotes, ---
//   - container directives:   ::: callout|warn Title  /  ::: p class  /  ::: div class
//   - block includes {{ns:name}} and inline variables {{a.b}}
//   - raw HTML blocks (a line starting with a tag) and a small inline-tag whitelist
// Code is ALWAYS escaped, so things like "<year:[num]4>" in a snippet can never be
// mistaken for HTML (a bug the hand-written guide used to have).

const TEXT_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

export function escapeText(s) {
    return s.replace(/[&<>]/g, (c) => TEXT_ESC[c]);
}

export function escapeAttr(s) {
    return escapeText(s).replace(/"/g, "&quot;");
}

export class ContentError extends Error {
    constructor(message, file, line) {
        super(`${file ?? "<markdown>"}${line ? `:${line}` : ""}: ${message}`);
        this.name = "ContentError";
    }
}

// ---------------------------------------------------------------- front matter

function parseScalar(raw) {
    const v = raw.trim();
    if (v === "true") return true;
    if (v === "false") return false;
    if ((v.startsWith('"') && v.endsWith('"') && v.length >= 2) || (v.startsWith("'") && v.endsWith("'") && v.length >= 2)) {
        return v.slice(1, -1);
    }
    return v;
}

/** Splits `---\nkey: value\n---\nbody` into { data, body, bodyLine }. */
export function parseFrontmatter(source, file) {
    const src = source.replace(/\r\n?/g, "\n");
    if (!src.startsWith("---\n")) return { data: {}, body: src, bodyLine: 1 };
    const lines = src.split("\n");
    let end = -1;
    for (let i = 1; i < lines.length; i++) {
        if ((lines[i] ?? "").trim() === "---") {
            end = i;
            break;
        }
    }
    if (end === -1) throw new ContentError("front matter opened with '---' but never closed", file, 1);
    const data = {};
    for (let i = 1; i < end; i++) {
        const line = lines[i] ?? "";
        if (line.trim() === "" || line.trim().startsWith("#")) continue;
        const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
        if (!m) throw new ContentError(`bad front matter line: ${JSON.stringify(line)}`, file, i + 1);
        data[m[1] ?? ""] = parseScalar(m[2] ?? "");
    }
    return { data, body: lines.slice(end + 1).join("\n"), bodyLine: end + 2 };
}

// ------------------------------------------------------------------ variables

/** Replaces {{a.b}} (dot form) outside code, keeping line numbers intact. */
export function substituteVars(text, vars, file, firstLine = 1) {
    const lines = text.split("\n");
    let fence = null;
    let fenceSubstitutes = false;
    const VAR_RE = /\{\{([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+)\}\}/g;
    const sub = (segment, idx) =>
        segment.replace(VAR_RE, (_all, name) => {
            if (!vars || !Object.prototype.hasOwnProperty.call(vars, name)) {
                throw new ContentError(`unknown variable {{${name}}}`, file, firstLine + idx);
            }
            const value = String(vars[name]);
            if (value.includes("\n")) throw new ContentError(`variable {{${name}}} contains a newline`, file, firstLine + idx);
            return value;
        });
    const out = lines.map((line, idx) => {
        const fm = /^\s{0,3}(`{3,}|~{3,})\s*(.*)$/.exec(line);
        if (fm) {
            const marker = fm[1] ?? "";
            if (!fence) {
                fence = marker;
                // Opt-in: a fence whose info string has the `vars` flag gets variables
                // substituted inside it (e.g. the clone URL in the install instructions).
                fenceSubstitutes = /(^|\s)vars(\s|$)/.test(fm[2] ?? "");
            } else if (marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) {
                fence = null;
                fenceSubstitutes = false;
            }
            return line;
        }
        if (!line.includes("{{")) return line;
        if (fence) return fenceSubstitutes ? sub(line, idx) : line;
        return replaceOutsideCodeSpans(line, (segment) => sub(segment, idx));
    });
    return out.join("\n");
}

function replaceOutsideCodeSpans(line, fn) {
    let out = "";
    let i = 0;
    let plain = "";
    while (i < line.length) {
        if (line[i] === "`") {
            let n = 0;
            while (line[i + n] === "`") n++;
            const marker = "`".repeat(n);
            const close = findBacktickClose(line, i + n, n);
            if (close !== -1) {
                out += fn(plain) + line.slice(i, close + n);
                plain = "";
                i = close + n;
                continue;
            }
            plain += marker;
            i += n;
            continue;
        }
        plain += line[i];
        i++;
    }
    return out + fn(plain);
}

function findBacktickClose(s, from, n) {
    let j = from;
    while (j < s.length) {
        const k = s.indexOf("`", j);
        if (k === -1) return -1;
        let run = 0;
        while (s[k + run] === "`") run++;
        if (run === n) return k;
        j = k + run;
    }
    return -1;
}

// -------------------------------------------------------------------- inline

const INLINE_TAGS = new Set(["a", "br", "kbd", "sub", "sup", "span", "abbr", "small", "mark", "em", "strong", "code"]);

function stripInlineMarkup(src) {
    return src
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/`+([^`]*)`+/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/\\([\\`*[\]()#+\-.!_{}|<>~$:])/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
}

/** Plain text of an inline-markdown string (used for TOC labels). */
export function plainText(src) {
    return stripInlineMarkup(src);
}

function findClose(src, from, delim) {
    let i = from;
    while (i < src.length) {
        const ch = src[i];
        if (ch === "\\") {
            i += 2;
            continue;
        }
        if (ch === "`") {
            let n = 0;
            while (src[i + n] === "`") n++;
            const close = findBacktickClose(src, i + n, n);
            i = close === -1 ? i + n : close + n;
            continue;
        }
        if (src.startsWith(delim, i)) {
            const before = src[i - 1];
            if (i > from && before !== undefined && !/\s/.test(before)) {
                if (delim === "*" && (src[i + 1] === "*" || src[i - 1] === "*")) {
                    i++;
                    continue;
                }
                return i;
            }
        }
        i++;
    }
    return -1;
}

function findLinkEnd(src, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < src.length; i++) {
        const ch = src[i];
        if (ch === "\\") {
            i++;
            continue;
        }
        if (ch === "`") {
            let n = 0;
            while (src[i + n] === "`") n++;
            const close = findBacktickClose(src, i + n, n);
            if (close !== -1) i = close + n - 1;
            else i += n - 1;
            continue;
        }
        if (ch === "[") depth++;
        else if (ch === "]") {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

export function renderInline(src) {
    let out = "";
    let i = 0;
    while (i < src.length) {
        const ch = src[i];

        if (ch === "\\" && i + 1 < src.length && /[\\`*[\]()#+\-.!_{}|<>~$:]/.test(src[i + 1] ?? "")) {
            out += escapeText(src[i + 1] ?? "");
            i += 2;
            continue;
        }

        if (ch === "`") {
            let n = 0;
            while (src[i + n] === "`") n++;
            const close = findBacktickClose(src, i + n, n);
            if (close === -1) {
                out += "`".repeat(n);
                i += n;
                continue;
            }
            let content = src.slice(i + n, close).replace(/\n/g, " ");
            if (content.length > 2 && content.startsWith(" ") && content.endsWith(" ") && content.trim() !== "") {
                content = content.slice(1, -1);
            }
            out += `<code>${escapeText(content)}</code>`;
            i = close + n;
            continue;
        }

        if (ch === "[") {
            const end = findLinkEnd(src, i);
            if (end !== -1 && src[end + 1] === "(") {
                const closeParen = src.indexOf(")", end + 2);
                if (closeParen !== -1) {
                    const target = src.slice(end + 2, closeParen).trim();
                    const tm = /^(\S+)(?:\s+"([^"]*)")?$/.exec(target);
                    if (tm) {
                        const url = tm[1] ?? "";
                        const title = tm[2];
                        const external = /^https?:\/\//i.test(url);
                        const attrs =
                            ` href="${escapeAttr(url)}"` +
                            (title ? ` title="${escapeAttr(title)}"` : "") +
                            (external ? ' target="_blank" rel="noreferrer"' : "");
                        out += `<a${attrs}>${renderInline(src.slice(i + 1, end))}</a>`;
                        i = closeParen + 1;
                        continue;
                    }
                }
            }
            out += "[";
            i++;
            continue;
        }

        if (ch === "*") {
            const strong = src.startsWith("**", i);
            const delim = strong ? "**" : "*";
            const next = src[i + delim.length];
            if (next !== undefined && !/\s/.test(next)) {
                const close = findClose(src, i + delim.length, delim);
                if (close !== -1) {
                    const tag = strong ? "strong" : "em";
                    out += `<${tag}>${renderInline(src.slice(i + delim.length, close))}</${tag}>`;
                    i = close + delim.length;
                    continue;
                }
            }
            out += "*";
            i++;
            continue;
        }

        if (ch === "<") {
            const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*)\s*(\/?)>/.exec(src.slice(i));
            if (m && INLINE_TAGS.has((m[2] ?? "").toLowerCase())) {
                out += m[0];
                i += m[0].length;
                continue;
            }
            out += "&lt;";
            i++;
            continue;
        }

        if (ch === "&") {
            const m = /^&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/.exec(src.slice(i));
            if (m) {
                out += m[0];
                i += m[0].length;
                continue;
            }
            out += "&amp;";
            i++;
            continue;
        }

        if (ch === ">") {
            out += "&gt;";
            i++;
            continue;
        }

        out += ch;
        i++;
    }
    return out;
}

// --------------------------------------------------------------------- blocks

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*$/;
const ATTR_TAIL_RE = /\s+\{((?:[#.][\w-]+|[\w-]+="[^"]*")(?:\s+(?:[#.][\w-]+|[\w-]+="[^"]*"))*)\}\s*$/;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const DIRECTIVE_OPEN_RE = /^:::\s*([A-Za-z][\w-]*)\s*(.*?)\s*$/;
const INCLUDE_RE = /^\{\{([A-Za-z][\w-]*:[\w.-]+)\}\}\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
const HR_RE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const RAW_HTML_RE = /^<(?:[a-zA-Z][\w-]*|\/|!)/;

/** Parses the info string after a code fence: `cuff fragment error=E4006`. */
const FENCE_FLAGS = new Set(["vars", "skip", "fragment"]);

export function parseFenceInfo(info) {
    const tokens = (info || "").trim().split(/\s+/).filter(Boolean);
    // "```vars" means "no language, but substitute variables" - a flag is never a language.
    const lang = tokens[0] !== undefined && !FENCE_FLAGS.has(tokens[0]) && !/=/.test(tokens[0]) ? (tokens.shift() ?? "") : "";
    const flags = new Set();
    const attrs = {};
    for (const t of tokens) {
        const m = /^([\w-]+)=(.*)$/.exec(t);
        if (m) attrs[m[1] ?? ""] = (m[2] ?? "").replace(/^"|"$/g, "");
        else flags.add(t);
    }
    return { lang, flags, attrs };
}

function parseHeadingAttrs(raw) {
    const attrs = { id: undefined, classes: [], extra: {} };
    for (const tok of raw.match(/[#.][\w-]+|[\w-]+="[^"]*"/g) ?? []) {
        if (tok.startsWith("#")) attrs.id = tok.slice(1);
        else if (tok.startsWith(".")) attrs.classes.push(tok.slice(1));
        else {
            const eq = tok.indexOf("=");
            attrs.extra[tok.slice(0, eq)] = tok.slice(eq + 2, -1);
        }
    }
    return attrs;
}

function isBlockStart(line) {
    return (
        FENCE_RE.test(line) ||
        HEADING_RE.test(line) ||
        DIRECTIVE_OPEN_RE.test(line) ||
        /^:::\s*$/.test(line) ||
        INCLUDE_RE.test(line) ||
        /^ {0,3}> ?/.test(line) ||
        HR_RE.test(line) ||
        /^\s*([-*+]|1[.)])\s+\S/.test(line)
    );
}

function indentOf(line) {
    const m = /^ */.exec(line);
    return m ? m[0].length : 0;
}

class Renderer {
    constructor(opts) {
        this.opts = opts;
        this.file = opts.file;
        this.headings = [];
        this.codeBlocks = [];
    }

    err(message, lineNo) {
        return new ContentError(message, this.file, lineNo);
    }

    /** Renders an array of source lines to a list of block objects. */
    blocks(lines, firstLine, depth) {
        const out = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i] ?? "";
            const lineNo = firstLine + i;
            if (line.trim() === "") {
                i++;
                continue;
            }

            const fm = FENCE_RE.exec(line);
            if (fm) {
                const fence = fm[1] ?? "";
                const info = fm[2] ?? "";
                let j = i + 1;
                const body = [];
                let closed = false;
                while (j < lines.length) {
                    const l = lines[j] ?? "";
                    const t = l.trim();
                    if (t.startsWith(fence[0] ?? "`") && t === (fence[0] ?? "`").repeat(t.length) && t.length >= fence.length) {
                        closed = true;
                        break;
                    }
                    body.push(l);
                    j++;
                }
                if (!closed) throw this.err("code fence is never closed", lineNo);
                const parsed = parseFenceInfo(info);
                const code = body.join("\n");
                // fenceLine/endLine: the opening and closing ``` lines (used to pair a
                // block with the ```output block that documents its result).
                this.codeBlocks.push({ ...parsed, code, line: lineNo + 1, fenceLine: lineNo, endLine: firstLine + j });
                const cls = parsed.lang ? ` class="language-${escapeAttr(parsed.lang)}"` : "";
                // ```output blocks show a snippet's result; they get their own look (see base.css).
                const preAttr = parsed.lang === "output" ? ' class="code-output"' : "";
                out.push({ type: "html", html: `<pre${preAttr}><code${cls}>${escapeText(code)}</code></pre>` });
                i = j + 1;
                continue;
            }

            const dm = DIRECTIVE_OPEN_RE.exec(line);
            if (dm) {
                const end = this.findDirectiveEnd(lines, i);
                if (end === -1) throw this.err(`directive ':::${dm[1]}' is never closed with ':::'`, lineNo);
                out.push({ type: "html", html: this.directive(dm[1] ?? "", dm[2] ?? "", lines.slice(i + 1, end), lineNo + 1, depth) });
                i = end + 1;
                continue;
            }
            if (/^:::\s*$/.test(line)) throw this.err("stray ':::' with no open directive", lineNo);

            const im = INCLUDE_RE.exec(line);
            if (im) {
                const name = im[1] ?? "";
                const html = this.opts.include ? this.opts.include(name) : undefined;
                if (typeof html !== "string") throw this.err(`unknown include {{${name}}}`, lineNo);
                out.push({ type: "html", html });
                i++;
                continue;
            }

            const hm = HEADING_RE.exec(line);
            if (hm) {
                const level = (hm[1] ?? "#").length;
                let text = hm[2] ?? "";
                let attrs = { id: undefined, classes: [], extra: {} };
                const am = ATTR_TAIL_RE.exec(text);
                if (am) {
                    attrs = parseHeadingAttrs(am[1] ?? "");
                    text = text.slice(0, am.index);
                }
                out.push({ type: "heading", level, text, attrs, line: lineNo });
                i++;
                continue;
            }

            if (HR_RE.test(line)) {
                out.push({ type: "html", html: "<hr />" });
                i++;
                continue;
            }

            if (/^ {0,3}> ?/.test(line)) {
                const quote = [];
                let j = i;
                while (j < lines.length && /^ {0,3}> ?/.test(lines[j] ?? "")) {
                    quote.push((lines[j] ?? "").replace(/^ {0,3}> ?/, ""));
                    j++;
                }
                out.push({ type: "html", html: `<blockquote>${this.html(quote, lineNo, depth + 1)}</blockquote>` });
                i = j;
                continue;
            }

            if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1] ?? "") && (lines[i + 1] ?? "").includes("-")) {
                const res = this.table(lines, i, lineNo);
                out.push({ type: "html", html: res.html });
                i = res.next;
                continue;
            }

            if (LIST_RE.test(line)) {
                const res = this.list(lines, i, lineNo, depth);
                out.push({ type: "html", html: res.html });
                i = res.next;
                continue;
            }

            if (RAW_HTML_RE.test(line.trim())) {
                const raw = [];
                let j = i;
                while (j < lines.length && (lines[j] ?? "").trim() !== "") {
                    raw.push(lines[j] ?? "");
                    j++;
                }
                out.push({ type: "html", html: raw.join("\n") });
                i = j;
                continue;
            }

            const para = [];
            let j = i;
            while (j < lines.length) {
                const l = lines[j] ?? "";
                if (l.trim() === "") break;
                if (j > i && isBlockStart(l)) break;
                para.push(l.trim());
                j++;
            }
            out.push({ type: "html", html: `<p>${renderInline(para.join("\n"))}</p>` });
            i = j;
        }
        return out;
    }

    html(lines, firstLine, depth) {
        return this.blocks(lines, firstLine, depth)
            .map((b) => this.blockToHtml(b))
            .join("\n");
    }

    blockToHtml(b) {
        if (b.type === "html") return b.html;
        const idAttr = b.attrs.id ? ` id="${escapeAttr(b.attrs.id)}"` : "";
        const clsAttr = b.attrs.classes.length ? ` class="${escapeAttr(b.attrs.classes.join(" "))}"` : "";
        return `<h${b.level}${idAttr}${clsAttr}>${renderInline(b.text)}</h${b.level}>`;
    }

    findDirectiveEnd(lines, start) {
        let depth = 0;
        let fence = null;
        for (let j = start; j < lines.length; j++) {
            const l = lines[j] ?? "";
            const fm = FENCE_RE.exec(l);
            if (fm) {
                const marker = fm[1] ?? "";
                if (!fence) fence = marker;
                else if (marker[0] === fence[0] && marker.length >= fence.length && l.trim() === marker) fence = null;
                continue;
            }
            if (fence) continue;
            if (/^:::\s*$/.test(l)) {
                depth--;
                if (depth === 0) return j;
            } else if (DIRECTIVE_OPEN_RE.test(l)) {
                depth++;
            }
        }
        return -1;
    }

    directive(name, args, inner, innerLine, depth) {
        if (name === "callout" || name === "warn") {
            const title = args ? `<span class="callout-title">${renderInline(args)}</span>` : "";
            const bodyBlocks = this.blocks(inner, innerLine, depth + 1);
            let body;
            const only = bodyBlocks.length === 1 ? bodyBlocks[0] : undefined;
            const pm = only && only.type === "html" ? /^<p>([\s\S]*)<\/p>$/.exec(only.html) : null;
            if (pm) body = pm[1] ?? "";
            else body = bodyBlocks.map((b) => this.blockToHtml(b)).join("\n");
            const cls = name === "warn" ? "callout warn" : "callout";
            return `<div class="${cls}">${title}\n${body}\n</div>`;
        }
        if (name === "p") {
            if (!args) throw this.err("::: p needs a class name, e.g. '::: p home-news-intro'", innerLine - 1);
            const text = inner.map((l) => l.trim()).filter(Boolean).join("\n");
            return `<p class="${escapeAttr(args)}">${renderInline(text)}</p>`;
        }
        if (name === "div") {
            if (!args) throw this.err("::: div needs a class name", innerLine - 1);
            return `<div class="${escapeAttr(args)}">${this.html(inner, innerLine, depth + 1)}</div>`;
        }
        throw this.err(`unknown directive ':::${name}' (known: callout, warn, p, div)`, innerLine - 1);
    }

    splitRow(line) {
        let s = line.trim();
        if (s.startsWith("|")) s = s.slice(1);
        if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
        const cells = [];
        let cur = "";
        let i = 0;
        while (i < s.length) {
            const ch = s[i];
            if (ch === "\\" && s[i + 1] === "|") {
                cur += "|";
                i += 2;
                continue;
            }
            if (ch === "`") {
                let n = 0;
                while (s[i + n] === "`") n++;
                const close = findBacktickClose(s, i + n, n);
                if (close !== -1) {
                    // GFM: "\\|" inside a code span in a table cell means a literal pipe.
                    cur += s.slice(i, close + n).replace(/\\\|/g, "|");
                    i = close + n;
                    continue;
                }
            }
            if (ch === "|") {
                cells.push(cur.trim());
                cur = "";
                i++;
                continue;
            }
            cur += ch;
            i++;
        }
        cells.push(cur.trim());
        return cells;
    }

    table(lines, start, lineNo) {
        const head = this.splitRow(lines[start] ?? "");
        let j = start + 2;
        const rows = [];
        while (j < lines.length && (lines[j] ?? "").trim() !== "" && (lines[j] ?? "").includes("|")) {
            rows.push(this.splitRow(lines[j] ?? ""));
            j++;
        }
        const th = head.map((c) => `<th>${renderInline(c)}</th>`).join("");
        const body = rows
            .map((r) => {
                const cells = head.map((_h, idx) => `<td>${renderInline(r[idx] ?? "")}</td>`).join("");
                return `<tr>${cells}</tr>`;
            })
            .join("");
        if (rows.some((r) => r.length > head.length)) {
            throw this.err(`table row has more cells than the header (${head.length})`, lineNo);
        }
        let html = `<table class="ref-table"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
        if (this.opts.wrapTables) html = `<div class="${escapeAttr(this.opts.wrapTables)}">${html}</div>`;
        return { html, next: j };
    }

    list(lines, start, lineNo, depth) {
        const first = LIST_RE.exec(lines[start] ?? "");
        const baseIndent = (first?.[1] ?? "").length;
        const ordered = /\d/.test(first?.[2] ?? "");
        const items = [];
        let i = start;
        while (i < lines.length) {
            const line = lines[i] ?? "";
            const m = LIST_RE.exec(line);
            if (!m || m[1] === undefined || m[1].length !== baseIndent || /\d/.test(m[2] ?? "") !== ordered) break;
            const contentCol = m[1].length + (m[2] ?? "").length + 1;
            const itemLines = [(line.slice(contentCol) || "").replace(/^\s+/, "")];
            i++;
            while (i < lines.length) {
                const l = lines[i] ?? "";
                if (l.trim() === "") {
                    let k = i + 1;
                    while (k < lines.length && (lines[k] ?? "").trim() === "") k++;
                    if (k < lines.length && indentOf(lines[k] ?? "") >= contentCol) {
                        itemLines.push("");
                        i++;
                        continue;
                    }
                    break;
                }
                if (indentOf(l) >= contentCol) {
                    itemLines.push(l.slice(contentCol));
                    i++;
                    continue;
                }
                if (LIST_RE.test(l) || isBlockStart(l)) break;
                itemLines.push(l.trim());
                i++;
            }
            items.push({ itemLines, line: lineNo + (i - start) });
            if (i < lines.length && (lines[i] ?? "").trim() === "") {
                let k = i;
                while (k < lines.length && (lines[k] ?? "").trim() === "") k++;
                const nm = k < lines.length ? LIST_RE.exec(lines[k] ?? "") : null;
                if (nm && (nm[1] ?? "").length === baseIndent && /\d/.test(nm[2] ?? "") === ordered) i = k;
            }
        }
        const tag = ordered ? "ol" : "ul";
        const lis = items
            .map(({ itemLines, line }) => {
                const complex = itemLines.some((l) => l.trim() === "" || LIST_RE.test(l) || FENCE_RE.test(l));
                const inner = complex
                    ? this.html(itemLines, line, depth + 1)
                    : renderInline(itemLines.map((l) => l.trim()).join("\n"));
                return `<li>${inner}</li>`;
            })
            .join("\n");
        return { html: `<${tag}>\n${lis}\n</${tag}>`, next: i };
    }
}

// --------------------------------------------------------------------- public

/**
 * Renders Markdown to HTML.
 * options: {
 *   file, firstLine       - for error messages
 *   vars                  - { "engine.dlcCount": 10, ... } for {{a.b}}
 *   include(name)         - returns HTML for {{ns:name}}
 *   sections: { className } - wrap every "## heading" and what follows in <section>
 *   wrapTables            - class name of a <div> to wrap tables in
 * }
 * Returns { html, headings, codeBlocks }.
 */
export function renderMarkdown(source, options = {}) {
    const firstLine = options.firstLine ?? 1;
    const text = substituteVars(source.replace(/\r\n?/g, "\n"), options.vars, options.file, firstLine);
    const r = new Renderer(options);
    const blocks = r.blocks(text.split("\n"), firstLine, 0);

    const headings = [];
    const parts = [];
    let sectionOpen = false;
    const sec = options.sections;
    for (const b of blocks) {
        if (b.type === "heading") {
            headings.push({
                level: b.level,
                id: b.attrs.id,
                text: plainText(b.text),
                toc: b.attrs.extra.toc,
                line: b.line,
            });
            if (sec && b.level === 2) {
                if (!b.attrs.id) throw new ContentError(`section heading "${b.text}" needs an id, e.g. '## ${b.text} {#my-id}'`, options.file, b.line);
                if (sectionOpen) parts.push("</section>");
                parts.push(`<section class="${escapeAttr(sec.className)}" id="${escapeAttr(b.attrs.id)}">`);
                parts.push(`<h2>${renderInline(b.text)}</h2>`);
                sectionOpen = true;
                continue;
            }
        }
        parts.push(r.blockToHtml(b));
    }
    if (sectionOpen) parts.push("</section>");
    return { html: parts.join("\n"), headings, codeBlocks: r.codeBlocks };
}

/** Lists every fenced code block in a markdown file (for the engine check). */
export function extractCodeBlocks(source, file) {
    const { body, bodyLine } = parseFrontmatter(source, file);
    // Includes produce generated HTML, never code blocks, so they can be stubbed out here.
    const r = new Renderer({ file, include: () => "" });
    // Run the real block parser so fences inside directives/lists are found
    // the same way the renderer finds them.
    r.blocks(body.replace(/\r\n?/g, "\n").split("\n"), bodyLine, 0);
    return r.codeBlocks;
}
