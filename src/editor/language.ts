import { StreamLanguage } from "@codemirror/language";
import type { StringStream } from "@codemirror/language";
import {
    CUFF_KEYWORDS,
    CUFF_TYPES,
    CUFF_LITERALS,
    CUFF_CONSTANT_NAME,
} from "./keywords";

interface CuffState {
    blockComment: boolean;
    inFString: boolean;
    inInterp: boolean;
}

const WORD_RE = /^[A-Za-z_][A-Za-z0-9_]*/;

function token(stream: StringStream, state: CuffState): string | null {
    if (state.blockComment) {
        if (stream.match(/^endnote\b/)) {
            state.blockComment = false;
            return "comment";
        }
        stream.skipToEnd();
        return "comment";
    }

    if (stream.eatSpace()) return null;

    if (state.inFString) {
        if (state.inInterp) {
            if (stream.eat("}")) {
                state.inInterp = false;
                return "string";
            }
            if (stream.eat("'")) {
                while (!stream.eol()) {
                    if (stream.next() === "'") break;
                }
                return "string";
            }
            if (stream.match(/^\d+(\.\d+)?/)) return "number";
            if (stream.match(WORD_RE)) return "variableName";
            stream.next();
            return "operator";
        }
        if (stream.match("{{") || stream.match("}}")) return "string";
        if (stream.eat("{")) {
            state.inInterp = true;
            return "string";
        }
        if (stream.eat('"')) {
            state.inFString = false;
            return "string";
        }
        if (stream.eat("\\")) {
            if (!stream.eol()) stream.next();
            return "string";
        }
        stream.next();
        return "string";
    }

    if (stream.match(/^f"/)) {
        state.inFString = true;
        return "string";
    }

    if (stream.eat('"')) {
        while (!stream.eol()) {
            const ch = stream.next();
            if (ch === "\\") {
                if (!stream.eol()) stream.next();
                continue;
            }
            if (ch === '"') break;
        }
        return "string";
    }

    if (stream.match(/^\d+(\.\d+)?/)) return "number";

    if (stream.match(/^note\b/)) {
        if (stream.peek() === ":") {
            stream.next();
            const restOfLine = stream.string.slice(stream.pos).trim();
            if (restOfLine.length === 0) {
                state.blockComment = true;
            } else {
                stream.skipToEnd();
            }
            return "comment";
        }
        return "keyword";
    }

    const word = stream.match(WORD_RE) as RegExpMatchArray | null;
    if (word) {
        const text = word[0];
        if (CUFF_KEYWORDS.has(text)) return "keyword";
        if (CUFF_TYPES.has(text)) return "typeName";
        if (CUFF_LITERALS.has(text)) return "atom";
        if (text.length > 1 && CUFF_CONSTANT_NAME.test(text)) return "className";
        return "variableName";
    }

    if (stream.match(/^(>=|<=)/)) return "operator";
    if (stream.match(/^[+\-*/!~<>]/)) return "operator";
    if (stream.match(/^[()[\]{}]/)) return "bracket";
    if (stream.match(/^[,:.]/)) return "punctuation";

    stream.next();
    return null;
}

export const cuffLanguage = StreamLanguage.define<CuffState>({
    name: "cuffscript",
    startState: (): CuffState => ({
        blockComment: false,
        inFString: false,
        inInterp: false,
    }),
    token,
    languageData: {
        commentTokens: { line: "note:" },
        closeBrackets: { brackets: ["(", "[", "{", '"'] },
    },
});
