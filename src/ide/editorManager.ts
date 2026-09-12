import { EditorState } from "@codemirror/state";
import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLine,
    highlightActiveLineGutter,
    drawSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import { cuffLanguage } from "../editor/language";
import { cuffSyntaxHighlighting } from "../editor/highlightStyle";
import { cuffEditorTheme } from "../editor/theme";
import type { CuffFile } from "../engine/types";

const baseExtensions: Extension[] = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    drawSelection(),
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    search(),
    highlightSelectionMatches(),
    cuffLanguage,
    cuffSyntaxHighlighting,
    cuffEditorTheme,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
];

export class EditorManager {
    readonly view: EditorView;
    private docs = new Map<string, EditorState>();
    private activePath = "";
    private onChangeCallback: ((path: string, content: string) => void) | null = null;

    constructor(parent: HTMLElement) {
        this.view = new EditorView({ parent });
    }

    onChange(cb: (path: string, content: string) => void): void {
        this.onChangeCallback = cb;
    }

    private stateFor(path: string, content: string): EditorState {
        return EditorState.create({
            doc: content,
            extensions: [
                ...baseExtensions,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) this.onChangeCallback?.(path, update.state.doc.toString());
                }),
            ],
        });
    }

    loadProject(files: CuffFile[], activePath: string): void {
        this.docs.clear();
        for (const file of files) {
            this.docs.set(file.path, this.stateFor(file.path, file.content));
        }
        this.activePath = "";
        const target = this.docs.has(activePath) ? activePath : (files[0]?.path ?? "");
        this.switchTo(target);
    }

    switchTo(path: string): void {
        const nextState = this.docs.get(path);
        if (!nextState) return;
        if (this.activePath) this.docs.set(this.activePath, this.view.state);
        this.activePath = path;
        this.view.setState(nextState);
    }

    addFile(path: string, content = ""): void {
        this.docs.set(path, this.stateFor(path, content));
    }

    removeFile(path: string): void {
        this.docs.delete(path);
        // Prevent switchTo() from writing the live view state back under the
        // path we just deleted (it would otherwise resurrect it in `docs`).
        if (this.activePath === path) this.activePath = "";
    }

    hasFile(path: string): boolean {
        return this.docs.has(path);
    }

    listPaths(): string[] {
        return Array.from(this.docs.keys());
    }

    getContent(path: string): string {
        if (path === this.activePath) return this.view.state.doc.toString();
        return this.docs.get(path)?.doc.toString() ?? "";
    }

    snapshotFiles(): CuffFile[] {
        if (this.activePath) this.docs.set(this.activePath, this.view.state);
        return Array.from(this.docs.entries()).map(([path, state]) => ({
            path,
            content: state.doc.toString(),
        }));
    }

    get currentPath(): string {
        return this.activePath;
    }
}
