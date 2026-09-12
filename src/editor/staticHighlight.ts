import {
    CUFF_KEYWORDS,
    CUFF_TYPES,
    CUFF_LITERALS,
    CUFF_CONSTANT_NAME,
} from "./keywords";

const WORD_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const NUMBER_RE = /^\d+(\.\d+)?/;

function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrap(cls: string | null, text: string): string {
    const escaped = escapeHtml(text);
    return cls ? `<span class="${cls}">${escaped}</span>` : escaped;
}

export function highlightCuff(code: string): string {
    let i = 0;
    let out = "";
    let inBlockComment = false;
    let inFString = false;
    let inInterp = false;
    const n = code.length;

    while (i < n) {
        const rest = code.slice(i);
        const ch = code[i];

        if (inBlockComment) {
            const m = /^endnote\b/.exec(rest);
            if (m) {
                out += wrap("tok-comment", m[0]);
                i += m[0].length;
                inBlockComment = false;
                continue;
            }
            const eol = code.indexOf("\n", i);
            const end = eol === -1 ? n : eol;
            out += wrap("tok-comment", code.slice(i, end));
            i = end;
            continue;
        }

        if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
            out += ch;
            i += 1;
            continue;
        }

        if (inFString) {
            if (inInterp) {
                if (ch === "}") {
                    out += wrap("tok-string", "}");
                    i += 1;
                    inInterp = false;
                    continue;
                }
                if (ch === "'") {
                    let j = i + 1;
                    while (j < n && code[j] !== "'" && code[j] !== "\n") j++;
                    if (j < n && code[j] === "'") j++;
                    out += wrap("tok-string", code.slice(i, j));
                    i = j;
                    continue;
                }
                const numM = NUMBER_RE.exec(rest);
                if (numM) {
                    out += wrap("tok-number", numM[0]);
                    i += numM[0].length;
                    continue;
                }
                const wordM = WORD_RE.exec(rest);
                if (wordM) {
                    out += wrap(null, wordM[0]);
                    i += wordM[0].length;
                    continue;
                }
                out += wrap("tok-op", ch ?? "");
                i += 1;
                continue;
            }
            if (rest.startsWith("{{") || rest.startsWith("}}")) {
                out += wrap("tok-string", rest.slice(0, 2));
                i += 2;
                continue;
            }
            if (ch === "{") {
                out += wrap("tok-string", "{");
                i += 1;
                inInterp = true;
                continue;
            }
            if (ch === '"') {
                out += wrap("tok-string", '"');
                i += 1;
                inFString = false;
                continue;
            }
            if (ch === "\\") {
                out += wrap("tok-string", code.slice(i, i + 2));
                i += 2;
                continue;
            }
            out += wrap("tok-string", ch ?? "");
            i += 1;
            continue;
        }

        if (rest.startsWith('f"')) {
            out += wrap("tok-string", 'f"');
            i += 2;
            inFString = true;
            continue;
        }

        if (ch === '"') {
            let j = i + 1;
            while (j < n && code[j] !== '"') {
                j += code[j] === "\\" ? 2 : 1;
            }
            if (j < n) j += 1;
            out += wrap("tok-string", code.slice(i, j));
            i = j;
            continue;
        }

        const numMatch = NUMBER_RE.exec(rest);
        if (numMatch) {
            out += wrap("tok-number", numMatch[0]);
            i += numMatch[0].length;
            continue;
        }

        const noteMatch = /^note\b/.exec(rest);
        if (noteMatch) {
            const afterWord = i + noteMatch[0].length;
            if (code[afterWord] === ":") {
                const afterColon = afterWord + 1;
                const eol = code.indexOf("\n", afterColon);
                const lineEnd = eol === -1 ? n : eol;
                const restOfLine = code.slice(afterColon, lineEnd).trim();
                if (restOfLine.length === 0) {
                    inBlockComment = true;
                    out += wrap("tok-comment", code.slice(i, afterColon));
                    i = afterColon;
                } else {
                    out += wrap("tok-comment", code.slice(i, lineEnd));
                    i = lineEnd;
                }
                continue;
            }
        }

        const wordMatch = WORD_RE.exec(rest);
        if (wordMatch) {
            const text = wordMatch[0];
            let cls: string | null = null;
            if (CUFF_KEYWORDS.has(text)) cls = "tok-keyword";
            else if (CUFF_TYPES.has(text) || CUFF_LITERALS.has(text)) cls = "tok-type";
            else if (text.length > 1 && CUFF_CONSTANT_NAME.test(text)) cls = "tok-const";
            out += wrap(cls, text);
            i += text.length;
            continue;
        }

        const opMatch = /^(>=|<=)/.exec(rest);
        if (opMatch) {
            out += wrap("tok-op", opMatch[0]);
            i += opMatch[0].length;
            continue;
        }
        if (ch !== undefined && /[+\-*/!~<>()[\]{}]/.test(ch)) {
            out += wrap("tok-op", ch);
            i += 1;
            continue;
        }
        if (ch !== undefined && /[,:.]/.test(ch)) {
            out += escapeHtml(ch);
            i += 1;
            continue;
        }

        out += escapeHtml(ch ?? "");
        i += 1;
    }

    return out;
}

export function highlightCuffBlocks(root: ParentNode = document): void {
    root.querySelectorAll<HTMLElement>("code.language-cuff").forEach((block) => {
        const source = block.textContent ?? "";
        block.innerHTML = highlightCuff(source);
    });
}
