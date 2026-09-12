import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const cuffHighlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: "var(--code-keyword)", fontWeight: 600 },
    { tag: tags.typeName, color: "var(--code-type)" },
    { tag: tags.className, color: "var(--code-const)", fontWeight: 600 },
    { tag: tags.atom, color: "var(--code-type)", fontWeight: 600 },
    { tag: tags.string, color: "var(--code-string)" },
    { tag: tags.number, color: "var(--code-number)" },
    { tag: tags.comment, color: "var(--code-comment)", fontStyle: "italic" },
    { tag: tags.operator, color: "var(--code-op)" },
    { tag: tags.bracket, color: "var(--code-op)" },
    { tag: tags.punctuation, color: "var(--code-op)" },
    { tag: tags.variableName, color: "var(--text)" },
]);

export const cuffSyntaxHighlighting = syntaxHighlighting(cuffHighlightStyle);
