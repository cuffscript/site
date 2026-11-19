import { EditorSelection } from "@codemirror/state";
import type { EditorState, SelectionRange } from "@codemirror/state";
import { lineNumbers } from "@codemirror/view";

/**
 * The selection that covers whole lines `a` through `b` (in either order), including the
 * line break after the last one, as clicking a line number does in other editors.
 * Dragging upward puts the head at the top so the selection grows that way.
 */
export function wholeLines(state: EditorState, a: number, b: number): SelectionRange {
    const doc = state.doc;
    const first = doc.line(Math.min(a, b));
    const last = doc.line(Math.max(a, b));
    const end = Math.min(last.to + 1, doc.length);
    return a <= b ? EditorSelection.range(first.from, end) : EditorSelection.range(end, first.from);
}

/** Line numbers that can be pressed to select a line, and dragged to select several. */
export const selectableLineNumbers = lineNumbers({
    domEventHandlers: {
        mousedown(view, line, event) {
            if (!(event instanceof MouseEvent) || event.button !== 0) return false;
            const anchor = view.state.doc.lineAt(line.from).number;
            view.dispatch({ selection: wholeLines(view.state, anchor, anchor), userEvent: "select.pointer" });
            view.focus();

            const lineAt = (clientY: number) => view.state.doc.lineAt(view.lineBlockAtHeight(clientY - view.documentTop).from).number;
            const move = (e: MouseEvent) => {
                view.dispatch({ selection: wholeLines(view.state, anchor, lineAt(e.clientY)), scrollIntoView: true, userEvent: "select.pointer" });
            };
            const stop = () => {
                window.removeEventListener("mousemove", move);
                window.removeEventListener("mouseup", stop);
            };
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", stop);
            event.preventDefault();
            return true;
        },
    },
});
