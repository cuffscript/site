import { EditorView } from "@codemirror/view";

export const cuffEditorTheme = EditorView.theme({
    "&": {
        color: "var(--cm-fg)",
        backgroundColor: "var(--cm-bg)",
    },
    ".cm-content": {
        caretColor: "var(--cm-cursor)",
        padding: "12px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--cm-cursor)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "var(--cm-selection)",
    },
    ".cm-activeLine": {
        backgroundColor: "var(--cm-line-active)",
    },
    ".cm-activeLineGutter": {
        backgroundColor: "var(--cm-line-active)",
    },
    ".cm-gutters": {
        backgroundColor: "var(--cm-gutter-bg)",
        color: "var(--cm-gutter-fg)",
        border: "none",
        borderRight: "1px solid var(--border)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 12px 0 14px",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
        backgroundColor: "var(--accent-soft)",
        outline: "1px solid var(--accent)",
    },
    ".cm-searchMatch": {
        backgroundColor: "var(--accent-soft)",
    },
    ".cm-searchMatch-selected": {
        backgroundColor: "var(--cm-selection)",
    },
    ".cm-panels": {
        backgroundColor: "var(--bg-elevated)",
        color: "var(--text)",
    },
    ".cm-tooltip": {
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
    },
});
