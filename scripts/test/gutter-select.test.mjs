import { test } from "node:test";
import assert from "node:assert/strict";
import { EditorState } from "@codemirror/state";
import { wholeLines } from "../../src/editor/gutterSelect.ts";

const state = EditorState.create({ doc: "one\ntwo\nthree\nfour" });
const text = (range) => state.sliceDoc(range.from, range.to);

test("one line: its text and the line break after it", () => {
    const r = wholeLines(state, 2, 2);
    assert.equal(text(r), "two\n");
    assert.deepEqual([r.anchor, r.head], [4, 8]);
});

test("dragging down covers every line in between, head at the bottom", () => {
    const r = wholeLines(state, 1, 3);
    assert.equal(text(r), "one\ntwo\nthree\n");
    assert.ok(r.anchor < r.head);
});

test("dragging up covers the same lines with the head at the top", () => {
    const r = wholeLines(state, 3, 1);
    assert.equal(text(r), "one\ntwo\nthree\n");
    assert.ok(r.head < r.anchor);
    assert.equal(r.head, 0);
});

test("the last line has no break after it, so the selection stops at the end", () => {
    const r = wholeLines(state, 4, 4);
    assert.equal(text(r), "four");
    assert.equal(r.to, state.doc.length);
});

test("an empty document still gives a valid range", () => {
    const empty = EditorState.create({ doc: "" });
    const r = wholeLines(empty, 1, 1);
    assert.deepEqual([r.from, r.to], [0, 0]);
});
