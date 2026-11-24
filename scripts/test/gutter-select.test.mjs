import { test } from "node:test";
import assert from "node:assert/strict";

// The engine-compat workflow runs the tests without `npm install`, so these tests need the editor
// packages only when they are there, and are skipped when they are not.
let EditorState;
let wholeLines;
try {
    ({ EditorState } = await import("@codemirror/state"));
    ({ wholeLines } = await import("../../src/editor/gutterSelect.ts"));
} catch {
    /* the packages are not installed */
}
const skip = wholeLines ? false : "the editor packages are not installed (run npm install)";

const state = EditorState?.create({ doc: "one\ntwo\nthree\nfour" });
const text = (range) => state.sliceDoc(range.from, range.to);

test("one line: its text and the line break after it", { skip }, () => {
    const r = wholeLines(state, 2, 2);
    assert.equal(text(r), "two\n");
    assert.deepEqual([r.anchor, r.head], [4, 8]);
});

test("dragging down covers every line in between, head at the bottom", { skip }, () => {
    const r = wholeLines(state, 1, 3);
    assert.equal(text(r), "one\ntwo\nthree\n");
    assert.ok(r.anchor < r.head);
});

test("dragging up covers the same lines with the head at the top", { skip }, () => {
    const r = wholeLines(state, 3, 1);
    assert.equal(text(r), "one\ntwo\nthree\n");
    assert.ok(r.head < r.anchor);
    assert.equal(r.head, 0);
});

test("the last line has no break after it, so the selection stops at the end", { skip }, () => {
    const r = wholeLines(state, 4, 4);
    assert.equal(text(r), "four");
    assert.equal(r.to, state.doc.length);
});

test("an empty document still gives a valid range", { skip }, () => {
    const empty = EditorState.create({ doc: "" });
    const r = wholeLines(empty, 1, 1);
    assert.deepEqual([r.from, r.to], [0, 0]);
});
